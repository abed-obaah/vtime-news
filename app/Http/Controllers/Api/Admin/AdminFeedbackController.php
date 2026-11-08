<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeedbackResource;
use App\Mail\FeedbackReplyMail;
use App\Models\ActivityLog;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class AdminFeedbackController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Feedback::query();

        $status = $request->string('status')->trim()->value();

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($type = $request->string('type')->trim()->value()) {
            $query->where('type', $type);
        }

        return FeedbackResource::collection(
            $query->orderByDesc('created_at')->paginate((int) $request->integer('per_page', 25))->withQueryString()
        );
    }

    public function reply(Request $request, Feedback $feedback): JsonResponse
    {
        $data = $request->validate([
            'reply' => ['required', 'string', 'min:2', 'max:2000'],
            'resolve' => ['sometimes', 'boolean'],
        ]);

        $reply = strip_tags($data['reply']);

        $feedback->update([
            'admin_reply' => $reply,
            'replied_at' => now(),
            'status' => ($data['resolve'] ?? true) ? 'resolved' : $feedback->status,
        ]);

        // The reply is saved either way; a mail outage must not lose the text
        // or fail the request. The admin is told whether it actually went out.
        $emailed = false;
        $emailError = null;

        if (filter_var($feedback->email, FILTER_VALIDATE_EMAIL)) {
            try {
                Mail::to($feedback->email)->send(new FeedbackReplyMail($feedback->fresh(), $reply));
                $emailed = true;
            } catch (Throwable $e) {
                $emailError = $e->getMessage();
                Log::error('Feedback reply email failed', [
                    'feedback_id' => $feedback->id,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            $emailError = 'No valid email address on this message.';
        }

        $feedback->forceFill(['reply_emailed_at' => $emailed ? now() : null])->save();

        ActivityLog::record(
            'feedback',
            $emailed ? 'Feedback answered and emailed' : 'Feedback answered (not emailed)',
            $feedback->subject,
            $feedback
        );

        return response()->json([
            'data' => new FeedbackResource($feedback->fresh()),
            'emailed' => $emailed,
            'message' => $emailed
                ? 'Response saved and emailed to '.$feedback->email.'.'
                : 'Response saved, but the email could not be sent'.($emailError ? ': '.$emailError : '.').' Check your mail settings.',
        ]);
    }

    public function resolve(Feedback $feedback): JsonResponse
    {
        $feedback->update(['status' => 'resolved']);

        return response()->json([
            'data' => new FeedbackResource($feedback->fresh()),
            'message' => 'Marked as resolved.',
        ]);
    }

    public function destroy(Feedback $feedback): JsonResponse
    {
        $feedback->delete();

        return response()->json(['message' => 'Feedback deleted.']);
    }
}

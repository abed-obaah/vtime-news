<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'type' => ['required', 'in:bug,suggestion,feedback'],
            'subject' => ['required', 'string', 'min:3', 'max:160'],
            'message' => ['required', 'string', 'min:5', 'max:4000'],
            'name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'email' => [$user ? 'sometimes' : 'required', 'nullable', 'email:rfc', 'max:180'],
        ]);

        $feedback = Feedback::create([
            'user_id' => $user?->id,
            'name' => $data['name'] ?? $user?->name,
            'email' => strtolower($data['email'] ?? $user?->email ?? ''),
            'type' => $data['type'],
            'subject' => strip_tags($data['subject']),
            'message' => strip_tags($data['message']),
            'status' => 'open',
        ]);

        ActivityLog::record('feedback', 'Feedback received', $feedback->subject, $feedback, $user?->id);

        return response()->json([
            'message' => 'Thanks — your message reached the newsroom.',
            'id' => (string) $feedback->id,
        ], 201);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\LiveStreamController;
use App\Http\Controllers\Controller;
use App\Http\Resources\LiveStreamResource;
use App\Models\ActivityLog;
use App\Models\LiveStream;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminLiveStreamController extends Controller
{
    public function __construct(private readonly LiveStreamController $streams) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['sometimes', 'nullable', 'in:all,live,ended'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = LiveStream::query()->with(['host', 'category', 'endedBy']);

        $status = $request->string('status')->trim()->value();

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        $streams = $query->orderByDesc('started_at')->paginate((int) $request->integer('per_page', 20))->withQueryString();

        // Live viewer counts for just the "live" rows on this page.
        $this->streams->attachViewerCounts(collect($streams->items())->filter->isLive());

        return LiveStreamResource::collection($streams);
    }

    public function counts(): JsonResponse
    {
        return response()->json([
            'data' => ['live' => LiveStream::query()->live()->count()],
        ]);
    }

    /** Force-end anyone's broadcast — moderation action. */
    public function end(Request $request, LiveStream $stream): JsonResponse
    {
        if (! $stream->isLive()) {
            return response()->json(['message' => 'That broadcast has already ended.'], 409);
        }

        $this->streams->endStream($stream, $request->user()->id, 'admin_ended');

        ActivityLog::record('live', 'Broadcast force-ended by admin', $stream->title, $stream, $request->user()->id);

        return response()->json([
            'data' => new LiveStreamResource($stream->fresh(['host', 'category'])),
            'message' => 'Broadcast ended.',
        ]);
    }

    /** Clears a stream out of the history list entirely. */
    public function destroy(LiveStream $stream): JsonResponse
    {
        if ($stream->isLive()) {
            return response()->json(['message' => 'End the broadcast before deleting it.'], 409);
        }

        $title = $stream->title;
        $stream->delete();

        ActivityLog::record('live', 'Broadcast record deleted', $title, null, auth()->id());

        return response()->json(['message' => 'Broadcast removed.']);
    }
}

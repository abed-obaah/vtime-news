<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LiveStreamResource;
use App\Models\ActivityLog;
use App\Models\LiveStream;
use App\Services\LiveKit\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LiveStreamController extends Controller
{
    public function __construct(private readonly LiveKitService $liveKit) {}

    /** Everyone currently broadcasting — the "Live Now" rail. */
    public function index(): AnonymousResourceCollection
    {
        $streams = LiveStream::query()
            ->live()
            ->with(['host', 'category'])
            ->orderByDesc('started_at')
            ->limit(60)
            ->get();

        $this->attachViewerCounts($streams);

        return LiveStreamResource::collection($streams);
    }

    public function show(LiveStream $stream): JsonResponse
    {
        $stream->load(['host', 'category']);
        $this->attachViewerCounts(collect([$stream]));

        return response()->json(['data' => new LiveStreamResource($stream)]);
    }

    /** Go live: creates the room and hands back a publish token. */
    public function store(Request $request): JsonResponse
    {
        if (! $this->liveKit->isConfigured()) {
            return response()->json([
                'message' => 'Live broadcasting is not configured on this server yet.',
            ], 503);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:160'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
        ]);

        $user = $request->user();

        // One active broadcast per person at a time.
        $existing = LiveStream::query()->live()->where('user_id', $user->id)->first();

        if ($existing) {
            return response()->json([
                'message' => 'You are already live. End that broadcast before starting a new one.',
            ], 409);
        }

        $roomName = LiveStream::newRoomName();

        try {
            $this->liveKit->createRoom($roomName);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not reach the streaming service. Please try again.'], 502);
        }

        $stream = LiveStream::create([
            'user_id' => $user->id,
            'category_id' => $data['category_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'room_name' => $roomName,
            'status' => 'live',
            'started_at' => now(),
        ]);

        ActivityLog::record('live', 'Broadcast started', $stream->title, $stream, $user->id);

        $token = $this->liveKit->participantToken(
            identity: 'u'.$user->id,
            room: $roomName,
            grants: ['roomJoin' => true, 'canPublish' => true, 'canSubscribe' => true, 'canPublishData' => true],
            name: $user->name,
        );

        return response()->json([
            'data' => new LiveStreamResource($stream->load(['host', 'category'])),
            'token' => $token,
            'wsUrl' => $this->liveKit->wsUrl(),
        ], 201);
    }

    /** The broadcaster ending their own stream. */
    public function end(Request $request, LiveStream $stream): JsonResponse
    {
        if ($stream->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Only the broadcaster can end this stream.'], 403);
        }

        $this->endStream($stream, $request->user()->id, 'host_ended');

        return response()->json([
            'data' => new LiveStreamResource($stream->fresh()),
            'message' => 'Broadcast ended.',
        ]);
    }

    /** A viewer joining an in-progress broadcast. */
    public function token(Request $request, LiveStream $stream): JsonResponse
    {
        if (! $stream->isLive()) {
            return response()->json(['message' => 'This broadcast has ended.'], 409);
        }

        $user = $request->user();

        $token = $this->liveKit->participantToken(
            identity: 'u'.$user->id,
            room: $stream->room_name,
            grants: ['roomJoin' => true, 'canPublish' => false, 'canSubscribe' => true],
            name: $user->name,
        );

        return response()->json([
            'token' => $token,
            'wsUrl' => $this->liveKit->wsUrl(),
        ]);
    }

    /**
     * Also used by AdminLiveStreamController — viewer counts are shown the
     * same way in both the reader-facing list and the moderation table.
     *
     * @param  \Illuminate\Support\Collection<int, LiveStream>  $streams
     */
    public function attachViewerCounts($streams): void
    {
        if ($streams->isEmpty()) {
            return;
        }

        $counts = $this->liveKit->participantCounts($streams->pluck('room_name')->all());

        foreach ($streams as $stream) {
            // The broadcaster's own connection counts as a participant — don't
            // show a lone streamer as "1 viewer" of their own broadcast.
            $stream->viewer_count = max(0, ($counts[$stream->room_name] ?? 0) - 1);
        }
    }

    public function endStream(LiveStream $stream, int $endedBy, string $reason): void
    {
        $stream->forceFill([
            'status' => 'ended',
            'ended_at' => now(),
            'ended_by' => $endedBy,
            'end_reason' => $reason,
        ])->save();

        $this->liveKit->deleteRoom($stream->room_name);

        ActivityLog::record('live', 'Broadcast ended', $stream->title, $stream, $endedBy);
    }
}

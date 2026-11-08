<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** The reader's notifications, newest first. */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(50, (int) $request->integer('per_page', 20));

        $notifications = $request->user()
            ->notifications()
            ->paginate($perPage);

        return response()->json([
            'data' => $notifications->getCollection()->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? $n->type,
                'data' => $n->data,
                'readAt' => optional($n->read_at)->toIso8601String(),
                'createdAt' => optional($n->created_at)->toIso8601String(),
            ]),
            'meta' => [
                'total' => $notifications->total(),
                'unread' => $request->user()->unreadNotifications()->count(),
                'currentPage' => $notifications->currentPage(),
                'lastPage' => $notifications->lastPage(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['unread' => $request->user()->unreadNotifications()->count()]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}

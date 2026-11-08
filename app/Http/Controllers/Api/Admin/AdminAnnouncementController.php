<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnouncementResource;
use App\Models\ActivityLog;
use App\Models\Announcement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminAnnouncementController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AnnouncementResource::collection(Announcement::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $announcement = Announcement::create($this->validated($request));

        ActivityLog::record('announcement', 'Announcement published', $announcement->title, $announcement);

        return response()->json([
            'data' => new AnnouncementResource($announcement->refresh()),
            'message' => 'Announcement published.',
        ], 201);
    }

    public function update(Request $request, Announcement $announcement): JsonResponse
    {
        $announcement->update($this->validated($request, $announcement));

        return response()->json([
            'data' => new AnnouncementResource($announcement->fresh()),
            'message' => 'Announcement updated.',
        ]);
    }

    public function toggle(Announcement $announcement): JsonResponse
    {
        $announcement->update(['is_active' => ! $announcement->is_active]);

        return response()->json([
            'data' => new AnnouncementResource($announcement->fresh()),
            'message' => $announcement->is_active ? 'Announcement is live.' : 'Announcement hidden.',
        ]);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Announcement $announcement = null): array
    {
        $required = $announcement ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'min:2', 'max:160'],
            'message' => [$required, 'string', 'min:2', 'max:1000'],
            'type' => ['sometimes', 'in:info,warning,urgent'],
            'is_active' => ['sometimes', 'boolean'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
        ]);
    }
}

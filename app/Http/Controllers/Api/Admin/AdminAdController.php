<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdResource;
use App\Models\ActivityLog;
use App\Models\Ad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AdminAdController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return AdResource::collection(Ad::orderByDesc('priority')->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $ad = Ad::create($this->validated($request));

        ActivityLog::record('ad', 'Ad created', $ad->title, $ad);

        // refresh() so database defaults (is_active, counters) are in the payload.
        return response()->json(['data' => new AdResource($ad->refresh()), 'message' => 'Ad created.'], 201);
    }

    public function update(Request $request, Ad $ad): JsonResponse
    {
        $ad->update($this->validated($request, $ad));

        ActivityLog::record('ad', 'Ad updated', $ad->title, $ad);

        return response()->json(['data' => new AdResource($ad->fresh()), 'message' => 'Ad updated.']);
    }

    public function toggle(Ad $ad): JsonResponse
    {
        $ad->update(['is_active' => ! $ad->is_active]);

        return response()->json([
            'data' => new AdResource($ad->fresh()),
            'message' => $ad->is_active ? 'Ad is live.' : 'Ad paused.',
        ]);
    }

    public function destroy(Ad $ad): JsonResponse
    {
        $title = $ad->title;
        $ad->delete();

        ActivityLog::record('ad', 'Ad deleted', $title);

        return response()->json(['message' => 'Ad deleted.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Ad $ad = null): array
    {
        $required = $ad ? 'sometimes' : 'required';

        // A network ad (Google AdSense, Media.net, …) is just an embedded
        // snippet — it needs a label and the code, not our own card fields.
        $source = $request->input('source', $ad->source ?? 'custom');
        $isNetwork = $source === 'network';

        return $request->validate([
            'title' => [$required, 'string', 'min:2', 'max:160'],
            'source' => ['sometimes', Rule::in(Ad::SOURCES)],
            'network_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'code' => [$isNetwork ? $required : 'sometimes', 'nullable', 'string', 'max:20000'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'image' => ['sometimes', 'nullable', 'url', 'max:1000'],
            'link' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'placement' => [$required, Rule::in(Ad::PLACEMENTS)],
            'is_active' => ['sometimes', 'boolean'],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeedSourceResource;
use App\Models\ActivityLog;
use App\Models\FeedSource;
use App\Services\RssIngestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminFeedSourceController extends Controller
{
    public function __construct(private readonly RssIngestService $rss) {}

    public function index(): AnonymousResourceCollection
    {
        return FeedSourceResource::collection(
            FeedSource::with('category')->withCount('posts')->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $this->guardDuplicate($data['url']);

        $source = FeedSource::create($data);

        ActivityLog::record('feed', 'Feed added', $source->name, $source);

        return response()->json([
            'data' => new FeedSourceResource($source->refresh()->load('category')->loadCount('posts')),
            'message' => 'Feed added. Run a fetch to pull its latest stories.',
        ], 201);
    }

    public function update(Request $request, FeedSource $feed): JsonResponse
    {
        $data = $this->validated($request, $feed);

        if (isset($data['url'])) {
            $this->guardDuplicate($data['url'], $feed->id);
        }

        $feed->update($data);

        return response()->json([
            'data' => new FeedSourceResource($feed->fresh()->load('category')->loadCount('posts')),
            'message' => 'Feed updated.',
        ]);
    }

    public function toggle(FeedSource $feed): JsonResponse
    {
        $feed->update(['is_active' => ! $feed->is_active]);

        return response()->json([
            'data' => new FeedSourceResource($feed->fresh()->load('category')->loadCount('posts')),
            'message' => $feed->is_active ? 'Feed enabled.' : 'Feed paused.',
        ]);
    }

    public function destroy(FeedSource $feed): JsonResponse
    {
        $name = $feed->name;
        $feed->delete();

        ActivityLog::record('feed', 'Feed removed', $name);

        return response()->json(['message' => 'Feed removed. Stories already imported were kept.']);
    }

    /** Fetch one feed right now. */
    public function fetch(FeedSource $feed): JsonResponse
    {
        $result = $this->rss->fetchSource($feed);

        return response()->json([
            'data' => new FeedSourceResource($feed->fresh()->load('category')->loadCount('posts')),
            'result' => $result,
            'message' => $result['message'],
        ], $result['ok'] ? 200 : 422);
    }

    /** Fetch every active feed right now, ignoring the interval. */
    public function fetchAll(): JsonResponse
    {
        $summary = $this->rss->fetchAll(force: true);

        return response()->json([
            'summary' => $summary,
            'message' => "{$summary['imported']} new stories are waiting in the moderation queue.",
        ]);
    }

    private function guardDuplicate(string $url, ?int $ignoreId = null): void
    {
        $hash = hash('sha256', rtrim(trim($url), '/'));

        $exists = FeedSource::where('url_hash', $hash)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['url' => ['This feed is already in the list.']]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?FeedSource $feed = null): array
    {
        $required = $feed ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'min:2', 'max:120'],
            'url' => [$required, 'url', 'max:500'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('categories', 'id')],
            'is_active' => ['sometimes', 'boolean'],
            'auto_publish' => ['sometimes', 'boolean'],
            'fetch_interval_minutes' => ['sometimes', 'integer', 'min:5', 'max:1440'],
        ]);
    }
}

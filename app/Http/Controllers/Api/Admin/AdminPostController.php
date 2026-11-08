<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostDetailResource;
use App\Http\Resources\PostResource;
use App\Models\ActivityLog;
use App\Models\Post;
use App\Models\Tag;
use App\Services\HtmlSanitizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AdminPostController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['sometimes', 'nullable', 'string'],
            'source' => ['sometimes', 'nullable', 'in:manual,rss,user'],
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'q' => ['sometimes', 'nullable', 'string', 'max:160'],
            'sort' => ['sometimes', 'nullable', 'in:latest,oldest,views,title'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Post::query()->with(['category', 'tags', 'reviewer', 'feedSource']);

        $status = $request->string('status')->trim()->value();

        if ($status !== '' && $status !== 'all' && in_array($status, Post::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($source = $request->string('source')->trim()->value()) {
            $query->where('source', $source);
        }

        if ($category = $request->string('category')->trim()->value()) {
            $query->whereHas('category', fn (Builder $q) => $q->where('slug', $category));
        }

        if ($term = $request->string('q')->trim()->value()) {
            $query->search($term);
        }

        match ($request->string('sort')->value() ?: 'latest') {
            'oldest' => $query->orderBy('created_at'),
            'views' => $query->orderByDesc('views'),
            'title' => $query->orderBy('title'),
            default => $query->orderByDesc('created_at'),
        };

        return PostResource::collection(
            $query->paginate((int) $request->integer('per_page', 20))->withQueryString()
        );
    }

    /** Counts for the moderation tabs. */
    public function counts(): JsonResponse
    {
        $counts = Post::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'data' => [
                'all' => (int) $counts->sum(),
                'pending' => (int) ($counts['pending'] ?? 0),
                'draft' => (int) ($counts['draft'] ?? 0),
                'published' => (int) ($counts['published'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
                'archived' => (int) ($counts['archived'] ?? 0),
            ],
        ]);
    }

    public function show(Post $post): JsonResponse
    {
        $post->load(['category', 'tags', 'reviewer', 'feedSource']);

        return response()->json(['data' => new PostDetailResource($post)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $post = new Post([
            'title' => $data['title'],
            'slug' => Post::uniqueSlug($data['slug'] ?? $data['title']),
            'excerpt' => $data['excerpt'] ?? HtmlSanitizer::toText($data['content'] ?? '', 260),
            'content' => HtmlSanitizer::clean($data['content'] ?? ''),
            'image' => $data['image'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'author' => $data['author'] ?? $request->user()->name,
            'status' => $data['status'] ?? 'draft',
            'source' => 'manual',
            'is_featured' => $data['is_featured'] ?? false,
            'is_breaking' => $data['is_breaking'] ?? false,
            'created_by' => $request->user()->id,
        ]);

        $post->read_time = $this->readingTime($post->content);

        if ($post->status === 'published') {
            $post->published_at = $data['published_at'] ?? now();
            $post->reviewed_by = $request->user()->id;
            $post->reviewed_at = now();
        }

        $post->save();
        $this->syncTags($post, $data['tags'] ?? []);

        ActivityLog::record('post', 'Post created', $post->title, $post, $request->user()->id);

        return response()->json([
            'data' => new PostDetailResource($post->load(['category', 'tags'])),
            'message' => 'Story saved.',
        ], 201);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        $data = $this->validatePayload($request, $post);

        if (array_key_exists('title', $data)) {
            $post->title = $data['title'];
        }

        if (! empty($data['slug']) && $data['slug'] !== $post->slug) {
            $post->slug = Post::uniqueSlug($data['slug'], $post->id);
        }

        if (array_key_exists('content', $data)) {
            $post->content = HtmlSanitizer::clean($data['content']);
            $post->read_time = $this->readingTime($post->content);
        }

        foreach (['excerpt', 'image', 'category_id', 'author', 'is_featured', 'is_breaking'] as $field) {
            if (array_key_exists($field, $data)) {
                $post->$field = $data[$field];
            }
        }

        if (blank($post->excerpt)) {
            $post->excerpt = HtmlSanitizer::toText($post->content, 260);
        }

        if (array_key_exists('status', $data) && $data['status'] !== $post->status) {
            $post->status = $data['status'];
            $post->reviewed_by = $request->user()->id;
            $post->reviewed_at = now();

            if ($post->status === 'published' && $post->published_at === null) {
                $post->published_at = now();
            }
        }

        if (array_key_exists('published_at', $data)) {
            $post->published_at = $data['published_at'];
        }

        $post->save();

        if (array_key_exists('tags', $data)) {
            $this->syncTags($post, $data['tags']);
        }

        ActivityLog::record('post', 'Post updated', $post->title, $post, $request->user()->id);

        return response()->json([
            'data' => new PostDetailResource($post->fresh()->load(['category', 'tags', 'reviewer'])),
            'message' => 'Changes saved.',
        ]);
    }

    /** Approve a story and put it in front of readers. */
    public function publish(Request $request, Post $post): JsonResponse
    {
        $data = $request->validate([
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $post->forceFill([
            'status' => 'published',
            'published_at' => $post->published_at ?? now(),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $data['note'] ?? $post->review_note,
        ])->save();

        ActivityLog::record('post', 'Post published', $post->title, $post, $request->user()->id);

        return response()->json([
            'data' => new PostResource($post->fresh()->load(['category', 'tags'])),
            'message' => 'Published to the live site.',
        ]);
    }

    public function reject(Request $request, Post $post): JsonResponse
    {
        $data = $request->validate([
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $post->forceFill([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $data['note'] ?? null,
        ])->save();

        ActivityLog::record('post', 'Post rejected', $post->title, $post, $request->user()->id);

        return response()->json([
            'data' => new PostResource($post->fresh()->load(['category', 'tags'])),
            'message' => 'Story rejected.',
        ]);
    }

    /** Pull a live story back off the site without deleting it. */
    public function unpublish(Request $request, Post $post): JsonResponse
    {
        $post->forceFill([
            'status' => 'draft',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        ActivityLog::record('post', 'Post unpublished', $post->title, $post, $request->user()->id);

        return response()->json([
            'data' => new PostResource($post->fresh()->load(['category', 'tags'])),
            'message' => 'Story moved back to drafts.',
        ]);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $title = $post->title;
        $post->delete();

        ActivityLog::record('post', 'Post deleted', $title, null, $request->user()->id);

        return response()->json(['message' => 'Story deleted.']);
    }

    /**
     * Apply one action to a batch of stories from the moderation queue.
     */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer'],
            'action' => ['required', 'in:publish,reject,draft,archive,delete,feature,unfeature'],
        ]);

        $posts = Post::whereIn('id', $data['ids'])->get();
        $userId = $request->user()->id;
        $affected = 0;

        foreach ($posts as $post) {
            match ($data['action']) {
                'publish' => $post->forceFill([
                    'status' => 'published',
                    'published_at' => $post->published_at ?? now(),
                    'reviewed_by' => $userId,
                    'reviewed_at' => now(),
                ])->save(),
                'reject' => $post->forceFill(['status' => 'rejected', 'reviewed_by' => $userId, 'reviewed_at' => now()])->save(),
                'draft' => $post->forceFill(['status' => 'draft', 'reviewed_by' => $userId, 'reviewed_at' => now()])->save(),
                'archive' => $post->forceFill(['status' => 'archived', 'reviewed_by' => $userId, 'reviewed_at' => now()])->save(),
                'feature' => $post->forceFill(['is_featured' => true])->save(),
                'unfeature' => $post->forceFill(['is_featured' => false])->save(),
                'delete' => $post->delete(),
            };

            $affected++;
        }

        ActivityLog::record('post', 'Bulk '.$data['action'], "{$affected} stories affected", null, $userId);

        return response()->json([
            'message' => "{$affected} stor".($affected === 1 ? 'y' : 'ies').' updated.',
            'affected' => $affected,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request, ?Post $post = null): array
    {
        $required = $post ? 'sometimes' : 'required';

        return $request->validate([
            'title' => [$required, 'string', 'min:3', 'max:480'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:180'],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'content' => [$required, 'string', 'max:200000'],
            'image' => ['sometimes', 'nullable', 'url', 'max:1000'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'author' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(Post::STATUSES)],
            'is_featured' => ['sometimes', 'boolean'],
            'is_breaking' => ['sometimes', 'boolean'],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'tags' => ['sometimes', 'array', 'max:12'],
            'tags.*' => ['string', 'max:60'],
        ]);
    }

    /**
     * @param  array<int, string>  $names
     */
    private function syncTags(Post $post, array $names): void
    {
        $ids = [];

        foreach ($names as $name) {
            $tag = Tag::fromName($name);

            if ($tag) {
                $ids[] = $tag->id;
            }
        }

        $post->tags()->sync(array_unique($ids));
    }

    private function readingTime(?string $html): int
    {
        return max(1, (int) ceil(str_word_count(strip_tags((string) $html)) / 200));
    }
}

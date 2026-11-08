<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\PostDetailResource;
use App\Http\Resources\PostResource;
use App\Models\Category;
use App\Models\Post;
use App\Models\PostView;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PostController extends Controller
{
    /**
     * Paginated, filterable list of published stories.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'tag' => ['sometimes', 'nullable', 'string', 'max:120'],
            'q' => ['sometimes', 'nullable', 'string', 'max:160'],
            'sort' => ['sometimes', 'nullable', 'in:latest,oldest,trending,top-rated,most-liked'],
            'featured' => ['sometimes', 'nullable', 'boolean'],
            'breaking' => ['sometimes', 'nullable', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:60'],
        ]);

        $query = $this->baseQuery();

        if ($slug = $request->string('category')->trim()->value()) {
            $query->whereHas('category', fn (Builder $q) => $q->where('slug', $slug));
        }

        if ($tag = $request->string('tag')->trim()->value()) {
            $query->whereHas('tags', fn (Builder $q) => $q->where('slug', $tag));
        }

        if ($term = $request->string('q')->trim()->value()) {
            $query->search($term);
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        if ($request->boolean('breaking')) {
            $query->where('is_breaking', true);
        }

        $this->applySort($query, $request->string('sort')->value() ?: 'latest');

        return PostResource::collection(
            $query->paginate((int) $request->integer('per_page', 12))->withQueryString()
        );
    }

    /**
     * Everything the homepage needs, in a single round-trip.
     */
    public function home(Request $request): JsonResponse
    {
        $featured = $this->baseQuery()
            ->where('is_featured', true)
            ->orderByDesc('published_at')
            ->limit(10)
            ->get();

        $latest = $this->baseQuery()
            ->orderByDesc('published_at')
            ->limit(18)
            ->get();

        $trending = $this->baseQuery()
            ->orderByDesc('views')
            ->limit(6)
            ->get();

        $editorPicks = $this->baseQuery()
            ->where('rating_count', '>', 0)
            ->orderByRaw('(rating_sum / rating_count) DESC')
            ->orderByDesc('views')
            ->limit(4)
            ->get();

        // The rating-based picks can come up short on a young site.
        if ($editorPicks->count() < 4) {
            $editorPicks = $this->baseQuery()
                ->orderByDesc('likes_count')
                ->orderByDesc('views')
                ->limit(4)
                ->get();
        }

        $breaking = $this->baseQuery()
            ->where('is_breaking', true)
            ->orderByDesc('published_at')
            ->limit(6)
            ->get();

        $categories = Category::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $sections = $categories->map(function (Category $category) {
            $posts = $this->baseQuery()
                ->where('category_id', $category->id)
                ->orderByDesc('published_at')
                ->limit(4)
                ->get();

            return [
                'category' => new CategoryResource($category),
                'posts' => PostResource::collection($posts),
            ];
        })->filter(fn ($section) => $section['posts']->collection->isNotEmpty())->values();

        return response()->json([
            'data' => [
                'featured' => PostResource::collection($featured),
                'latest' => PostResource::collection($latest),
                'trending' => PostResource::collection($trending),
                'editorPicks' => PostResource::collection($editorPicks),
                'breaking' => PostResource::collection($breaking),
                'sections' => $sections,
            ],
        ]);
    }

    /**
     * A single article, plus this viewer's like/save/rating state.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $post = $this->baseQuery()->where('slug', $slug)->firstOrFail();

        $this->registerView($request, $post);

        $user = $request->user();

        if ($user) {
            $post->viewer_liked = $post->likes()->where('user_id', $user->id)->exists();
            $post->viewer_saved = $post->bookmarks()->where('user_id', $user->id)->exists();
            $post->viewer_rating = (int) ($post->ratings()->where('user_id', $user->id)->value('value') ?? 0);
        }

        $post->loadMissing('reviewer');

        return response()->json(['data' => new PostDetailResource($post)]);
    }

    public function related(string $slug): AnonymousResourceCollection
    {
        $post = Post::published()->where('slug', $slug)->firstOrFail();

        $related = $this->baseQuery()
            ->whereKeyNot($post->id)
            ->when($post->category_id, fn (Builder $q) => $q->where('category_id', $post->category_id))
            ->orderByDesc('published_at')
            ->limit(6)
            ->get();

        if ($related->isEmpty()) {
            $related = $this->baseQuery()
                ->whereKeyNot($post->id)
                ->orderByDesc('views')
                ->limit(6)
                ->get();
        }

        return PostResource::collection($related);
    }

    private function baseQuery(): Builder
    {
        return Post::query()->published()->with(['category', 'tags']);
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->orderBy('published_at'),
            'trending' => $query->orderByDesc('views')->orderByDesc('published_at'),
            'most-liked' => $query->orderByDesc('likes_count')->orderByDesc('published_at'),
            'top-rated' => $query->orderByRaw('CASE WHEN rating_count = 0 THEN 0 ELSE rating_sum / rating_count END DESC')->orderByDesc('published_at'),
            default => $query->orderByDesc('published_at')->orderByDesc('id'),
        };
    }

    /**
     * Counts one view per visitor per article per day.
     */
    private function registerView(Request $request, Post $post): void
    {
        $visitorHash = hash('sha256', implode('|', [
            $request->user()?->id ?? 'guest',
            $request->ip(),
            substr((string) $request->userAgent(), 0, 120),
            config('app.key'),
        ]));

        try {
            $view = PostView::create([
                'post_id' => $post->id,
                'user_id' => $request->user()?->id,
                'visitor_hash' => $visitorHash,
                'viewed_on' => now()->toDateString(),
            ]);
        } catch (\Illuminate\Database\QueryException) {
            // Unique index tripped: this visitor already read it today.
            return;
        }

        if ($view->wasRecentlyCreated) {
            DB::table('posts')->where('id', $post->id)->increment('views');
            $post->views = $post->views + 1;
        }
    }
}

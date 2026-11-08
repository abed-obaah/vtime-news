<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Comment;
use App\Models\Feedback;
use App\Models\FeedSource;
use App\Models\Post;
use App\Models\PostView;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminStatsController extends Controller
{
    /** Numbers for the admin landing page. */
    public function overview(): JsonResponse
    {
        $now = Carbon::now();
        $thisMonth = $now->copy()->startOfMonth();
        $lastMonth = $thisMonth->copy()->subMonth();

        $totalPosts = Post::count();
        $totalViews = (int) Post::sum('views');
        $totalUsers = User::count();
        $totalComments = Comment::count();

        $topPosts = Post::published()
            ->with('category')
            ->orderByDesc('views')
            ->limit(5)
            ->get();

        $activity = ActivityLog::with('user:id,name')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => (string) $log->id,
                'action' => $log->action,
                'detail' => $log->description,
                'type' => $log->type,
                'user' => $log->user?->name,
                'createdAt' => optional($log->created_at)->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'stats' => [
                    'posts' => [
                        'value' => $totalPosts,
                        'change' => $this->percentChange(
                            Post::where('created_at', '>=', $thisMonth)->count(),
                            Post::whereBetween('created_at', [$lastMonth, $thisMonth])->count()
                        ),
                    ],
                    'views' => [
                        'value' => $totalViews,
                        'change' => $this->percentChange(
                            PostView::where('created_at', '>=', $thisMonth)->count(),
                            PostView::whereBetween('created_at', [$lastMonth, $thisMonth])->count()
                        ),
                    ],
                    'users' => [
                        'value' => $totalUsers,
                        'change' => $this->percentChange(
                            User::where('created_at', '>=', $thisMonth)->count(),
                            User::whereBetween('created_at', [$lastMonth, $thisMonth])->count()
                        ),
                    ],
                    'comments' => [
                        'value' => $totalComments,
                        'change' => $this->percentChange(
                            Comment::where('created_at', '>=', $thisMonth)->count(),
                            Comment::whereBetween('created_at', [$lastMonth, $thisMonth])->count()
                        ),
                    ],
                ],
                'queue' => [
                    'pendingPosts' => Post::where('status', 'pending')->count(),
                    'draftPosts' => Post::where('status', 'draft')->count(),
                    'publishedPosts' => Post::where('status', 'published')->count(),
                    'flaggedComments' => Comment::whereIn('status', ['flagged', 'pending'])->count(),
                    'openFeedback' => Feedback::where('status', 'open')->count(),
                    'activeFeeds' => FeedSource::where('is_active', true)->count(),
                    'failingFeeds' => FeedSource::where('last_status', 'failed')->count(),
                ],
                'topPosts' => PostResource::collection($topPosts),
                'activity' => $activity,
                'weeklyTraffic' => $this->weeklyTraffic(),
            ],
        ]);
    }

    /** Deeper numbers for the analytics screen. */
    public function analytics(Request $request): JsonResponse
    {
        $days = min(90, max(7, (int) $request->integer('days', 30)));
        $since = Carbon::today()->subDays($days - 1);

        $totalViews = (int) Post::sum('views');
        $totalLikes = (int) Post::sum('likes_count');
        $ratingSum = (int) Post::sum('rating_sum');
        $ratingCount = (int) Post::sum('rating_count');
        $publishedCount = Post::published()->count();

        $categoryStats = Category::query()
            ->withCount(['posts as post_count' => fn ($q) => $q->published()])
            ->withSum(['posts as total_views' => fn ($q) => $q->published()], 'views')
            ->orderByDesc('total_views')
            ->get()
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'color' => $category->color,
                'postCount' => (int) $category->post_count,
                'totalViews' => (int) ($category->total_views ?? 0),
            ]);

        $daily = PostView::query()
            ->selectRaw('viewed_on, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors')
            ->where('viewed_on', '>=', $since->toDateString())
            ->groupBy('viewed_on')
            ->orderBy('viewed_on')
            ->get()
            ->keyBy(fn ($row) => substr((string) $row->getRawOriginal('viewed_on'), 0, 10));

        $series = [];

        for ($cursor = $since->copy(); $cursor->lte(Carbon::today()); $cursor->addDay()) {
            $key = $cursor->toDateString();
            $row = $daily->get($key);

            $series[] = [
                'date' => $key,
                'day' => $cursor->format('D'),
                'views' => (int) ($row->views ?? 0),
                'visitors' => (int) ($row->visitors ?? 0),
            ];
        }

        return response()->json([
            'data' => [
                'totals' => [
                    'views' => $totalViews,
                    'likes' => $totalLikes,
                    'comments' => Comment::count(),
                    'avgRating' => $ratingCount > 0 ? round($ratingSum / $ratingCount, 1) : 0,
                    'avgReadTime' => $publishedCount > 0 ? (int) round((float) Post::published()->avg('read_time')) : 0,
                    'publishedPosts' => $publishedCount,
                    'subscribers' => User::where('role', 'user')->count(),
                ],
                'categories' => $categoryStats,
                'daily' => $series,
                'topPosts' => PostResource::collection(
                    Post::published()->with('category')->orderByDesc('views')->limit(10)->get()
                ),
                'sources' => FeedSource::withCount('posts')
                    ->orderByDesc('posts_count')
                    ->limit(10)
                    ->get()
                    ->map(fn (FeedSource $source) => [
                        'id' => (string) $source->id,
                        'name' => $source->name,
                        'postsCount' => (int) $source->posts_count,
                        'lastStatus' => $source->last_status,
                    ]),
            ],
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function weeklyTraffic(): array
    {
        $since = Carbon::today()->subDays(6);

        $rows = PostView::query()
            ->selectRaw('viewed_on, COUNT(*) as views')
            ->where('viewed_on', '>=', $since->toDateString())
            ->groupBy('viewed_on')
            ->get()
            ->mapWithKeys(fn ($row) => [substr((string) $row->getRawOriginal('viewed_on'), 0, 10) => (int) $row->views]);

        $series = [];

        for ($cursor = $since->copy(); $cursor->lte(Carbon::today()); $cursor->addDay()) {
            $key = $cursor->toDateString();

            $series[] = [
                'day' => $cursor->format('D'),
                'date' => $key,
                'views' => (int) ($rows[$key] ?? 0),
            ];
        }

        return $series;
    }

    private function percentChange(int $current, int $previous): string
    {
        if ($previous === 0) {
            return $current > 0 ? '+100%' : '0%';
        }

        $change = round((($current - $previous) / $previous) * 100);

        return ($change >= 0 ? '+' : '').$change.'%';
    }
}

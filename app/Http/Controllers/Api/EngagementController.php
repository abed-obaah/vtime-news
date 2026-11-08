<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostResource;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\PostLike;
use App\Models\Rating;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class EngagementController extends Controller
{
    public function toggleLike(Request $request, string $slug): JsonResponse
    {
        $post = Post::published()->where('slug', $slug)->firstOrFail();
        $userId = $request->user()->id;

        $existing = PostLike::where('post_id', $post->id)->where('user_id', $userId)->first();

        if ($existing) {
            $existing->delete();
            DB::table('posts')->where('id', $post->id)->update([
                'likes_count' => DB::raw('CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END'),
            ]);
            $liked = false;
        } else {
            PostLike::create(['post_id' => $post->id, 'user_id' => $userId]);
            DB::table('posts')->where('id', $post->id)->increment('likes_count');
            $liked = true;
        }

        return response()->json([
            'liked' => $liked,
            'likes' => (int) Post::whereKey($post->id)->value('likes_count'),
        ]);
    }

    public function toggleBookmark(Request $request, string $slug): JsonResponse
    {
        $post = Post::published()->where('slug', $slug)->firstOrFail();
        $userId = $request->user()->id;

        $existing = Bookmark::where('post_id', $post->id)->where('user_id', $userId)->first();

        if ($existing) {
            $existing->delete();
            $saved = false;
        } else {
            Bookmark::create(['post_id' => $post->id, 'user_id' => $userId]);
            $saved = true;
        }

        return response()->json(['saved' => $saved]);
    }

    public function rate(Request $request, string $slug): JsonResponse
    {
        $data = $request->validate([
            'value' => ['required', 'integer', 'min:1', 'max:5'],
        ]);

        $post = Post::published()->where('slug', $slug)->firstOrFail();

        Rating::updateOrCreate(
            ['post_id' => $post->id, 'user_id' => $request->user()->id],
            ['value' => $data['value']]
        );

        $post->recalculateRating();
        $post->refresh();

        return response()->json([
            'rating' => $post->rating,
            'ratingCount' => (int) $post->rating_count,
            'yourRating' => (int) $data['value'],
        ]);
    }

    public function bookmarks(Request $request): AnonymousResourceCollection
    {
        $posts = $request->user()
            ->bookmarkedPosts()
            ->published()
            ->with(['category', 'tags'])
            ->orderByDesc('bookmarks.created_at')
            ->get();

        return PostResource::collection($posts);
    }

    public function likes(Request $request): AnonymousResourceCollection
    {
        $posts = $request->user()
            ->likedPosts()
            ->published()
            ->with(['category', 'tags'])
            ->orderByDesc('post_likes.created_at')
            ->get();

        return PostResource::collection($posts);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\ActivityLog;
use App\Models\Comment;
use App\Models\CommentLike;
use App\Models\Post;
use App\Notifications\CommentLikeNotification;
use App\Notifications\CommentReplyNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentController extends Controller
{
    /** How deep a reply chain may go before replies flatten onto the parent. */
    private const MAX_DEPTH = 3;

    public function index(string $slug): JsonResponse
    {
        $post = Post::published()->where('slug', $slug)->firstOrFail();

        $comments = Comment::where('post_id', $post->id)
            ->where('status', 'approved')
            ->with('user:id,name,avatar')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => CommentResource::collection($this->nest($comments)),
            'meta' => ['total' => $comments->count()],
        ]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $post = Post::published()->where('slug', $slug)->firstOrFail();

        $data = $request->validate([
            'content' => ['required', 'string', 'min:2', 'max:2000'],
            'parent_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $parent = null;

        if (! empty($data['parent_id'])) {
            $parent = Comment::where('id', $data['parent_id'])
                ->where('post_id', $post->id)
                ->first();

            if (! $parent) {
                return response()->json(['message' => 'The comment you replied to no longer exists.'], 422);
            }

            // Keep the tree shallow enough for the UI to indent sensibly.
            $depth = 0;
            $walker = $parent;

            while ($walker->parent_id && $depth < self::MAX_DEPTH) {
                $walker = $walker->parent;

                if (! $walker) {
                    break;
                }

                $depth++;
            }

            if ($depth >= self::MAX_DEPTH - 1) {
                $parent = $walker ?? $parent;
            }
        }

        $comment = Comment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'parent_id' => $parent?->id,
            'author_name' => $request->user()->name,
            'content' => strip_tags($data['content']),
            'status' => 'approved',
        ]);

        DB::table('posts')->where('id', $post->id)->increment('comments_count');

        ActivityLog::record(
            'comment',
            'New comment',
            $request->user()->name.' commented on "'.$post->title.'"',
            $comment,
            $request->user()->id
        );

        $comment->load('user:id,name,avatar');

        if ($parent && $parent->user_id && $parent->user_id !== $request->user()->id) {
            $parent->user?->notify(new CommentReplyNotification($comment));
        }

        return response()->json(['data' => new CommentResource($comment)], 201);
    }

    public function like(Request $request, Comment $comment): JsonResponse
    {
        $userId = $request->user()->id;

        $existing = CommentLike::where('comment_id', $comment->id)->where('user_id', $userId)->first();

        if ($existing) {
            $existing->delete();
            $comment->decrement('likes_count');
            $liked = false;
        } else {
            CommentLike::create(['comment_id' => $comment->id, 'user_id' => $userId]);
            $comment->increment('likes_count');
            $liked = true;

            if ($comment->user_id && $comment->user_id !== $userId) {
                $comment->user?->notify(new CommentLikeNotification($comment, $request->user()));
            }
        }

        return response()->json([
            'liked' => $liked,
            'likes' => max(0, (int) $comment->fresh()->likes_count),
        ]);
    }

    public function report(Request $request, Comment $comment): JsonResponse
    {
        $comment->increment('reports_count');

        if ($comment->fresh()->reports_count >= 3 && $comment->status === 'approved') {
            $comment->update(['status' => 'flagged']);
        }

        return response()->json(['message' => 'Thanks — our moderators will take a look.']);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();

        if ($comment->user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json(['message' => 'You can only delete your own comments.'], 403);
        }

        $postId = $comment->post_id;
        $removed = 1 + $comment->replies()->count();

        $comment->delete();

        DB::table('posts')->where('id', $postId)->update([
            'comments_count' => DB::raw("CASE WHEN comments_count >= {$removed} THEN comments_count - {$removed} ELSE 0 END"),
        ]);

        return response()->json(['message' => 'Comment removed.']);
    }

    /**
     * Turn the flat list into parent -> replies, so the SPA can render it directly.
     *
     * @param  \Illuminate\Support\Collection<int, Comment>  $comments
     * @return \Illuminate\Support\Collection<int, Comment>
     */
    private function nest($comments)
    {
        $roots = collect();
        $byParent = [];

        foreach ($comments as $comment) {
            if ($comment->parent_id === null) {
                $roots->push($comment);
            } else {
                $byParent[(int) $comment->parent_id][] = $comment;
            }
        }

        $attach = function (Comment $comment) use (&$attach, $byParent) {
            $children = collect($byParent[(int) $comment->id] ?? [])->map($attach)->values();
            $comment->setRelation('replies', $children);

            return $comment;
        };

        return $roots->map($attach)->values();
    }
}

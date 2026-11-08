<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Models\ActivityLog;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AdminCommentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Comment::query()->with(['user:id,name', 'post:id,title,slug']);

        $status = $request->string('status')->trim()->value();

        if ($status !== '' && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($term = $request->string('q')->trim()->value()) {
            $like = '%'.$term.'%';
            $query->where(fn ($q) => $q->where('content', 'like', $like)->orWhere('author_name', 'like', $like));
        }

        return CommentResource::collection(
            $query->orderByDesc('created_at')->paginate((int) $request->integer('per_page', 25))->withQueryString()
        );
    }

    public function counts(): JsonResponse
    {
        $counts = Comment::selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return response()->json([
            'data' => [
                'all' => (int) $counts->sum(),
                'approved' => (int) ($counts['approved'] ?? 0),
                'pending' => (int) ($counts['pending'] ?? 0),
                'flagged' => (int) ($counts['flagged'] ?? 0),
                'rejected' => (int) ($counts['rejected'] ?? 0),
            ],
        ]);
    }

    public function update(Request $request, Comment $comment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected,flagged'],
        ]);

        $comment->update(['status' => $data['status']]);
        $this->syncPostCount($comment->post_id);

        ActivityLog::record('comment', 'Comment '.$data['status'], $comment->content, $comment);

        return response()->json([
            'data' => new CommentResource($comment->load(['user:id,name', 'post:id,title,slug'])),
            'message' => 'Comment '.$data['status'].'.',
        ]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $postId = $comment->post_id;
        $comment->delete();
        $this->syncPostCount($postId);

        ActivityLog::record('comment', 'Comment deleted');

        return response()->json(['message' => 'Comment deleted.']);
    }

    private function syncPostCount(int $postId): void
    {
        $count = Comment::where('post_id', $postId)->where('status', 'approved')->count();

        DB::table('posts')->where('id', $postId)->update(['comments_count' => $count]);
    }
}

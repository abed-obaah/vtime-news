<?php

use App\Http\Controllers\Api\AdController;
use App\Http\Controllers\Api\Admin\AdminAdController;
use App\Http\Controllers\Api\Admin\AdminAnnouncementController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\AdminCommentController;
use App\Http\Controllers\Api\Admin\AdminFeedbackController;
use App\Http\Controllers\Api\Admin\AdminFeedSourceController;
use App\Http\Controllers\Api\Admin\AdminLiveStreamController;
use App\Http\Controllers\Api\Admin\AdminPostController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminUploadController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\LiveKitWebhookController;
use App\Http\Controllers\Api\LiveStreamController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\UserSubmissionController;
use App\Http\Controllers\Api\TagController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'ok' => true,
    'service' => 'PulseNews API',
    'time' => now()->toIso8601String(),
]));

// LiveKit calls this directly (no user session) — it verifies its own
// signature inside the controller instead of relying on route middleware.
Route::post('/webhooks/livekit', [LiveKitWebhookController::class, 'handle']);

/*
|--------------------------------------------------------------------------
| Public — the reader-facing site
|--------------------------------------------------------------------------
| "optional.auth" resolves a bearer token when one is sent, so the same
| endpoints can return personalised flags without requiring a login.
*/
Route::middleware('optional.auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:password-reset');
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:password-reset');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    Route::get('/home', [PostController::class, 'home']);
    Route::get('/posts', [PostController::class, 'index']);
    Route::get('/posts/{slug}', [PostController::class, 'show']);
    Route::get('/posts/{slug}/related', [PostController::class, 'related']);
    Route::get('/posts/{slug}/comments', [CommentController::class, 'index']);

    Route::get('/tags', [TagController::class, 'index']);

    Route::get('/ads', [AdController::class, 'index']);
    Route::post('/ads/{ad}/impression', [AdController::class, 'impression']);
    Route::post('/ads/{ad}/click', [AdController::class, 'click']);

    Route::get('/announcements', [AnnouncementController::class, 'index']);

    Route::post('/feedback', [FeedbackController::class, 'store'])->middleware('throttle:feedback');

    // User news submissions — no login required
    Route::post('/posts/submit', [UserSubmissionController::class, 'store'])->middleware('throttle:6,1');

    Route::get('/live', [LiveStreamController::class, 'index']);
    Route::get('/live/{stream:room_name}', [LiveStreamController::class, 'show']);
});

/*
|--------------------------------------------------------------------------
| Authenticated readers
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'not.banned'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

    Route::post('/posts/{slug}/comments', [CommentController::class, 'store'])->middleware('throttle:comments');
    Route::post('/comments/{comment}/like', [CommentController::class, 'like']);
    Route::post('/comments/{comment}/report', [CommentController::class, 'report']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    Route::post('/posts/{slug}/like', [EngagementController::class, 'toggleLike']);
    Route::post('/posts/{slug}/bookmark', [EngagementController::class, 'toggleBookmark']);
    Route::post('/posts/{slug}/rate', [EngagementController::class, 'rate']);

    Route::get('/me/bookmarks', [EngagementController::class, 'bookmarks']);
    Route::get('/me/likes', [EngagementController::class, 'likes']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Any signed-in, non-banned reader can go live to report breaking news.
    Route::post('/live', [LiveStreamController::class, 'store'])->middleware('throttle:live-broadcast');
    Route::post('/live/{stream:room_name}/end', [LiveStreamController::class, 'end']);
    Route::post('/live/{stream:room_name}/token', [LiveStreamController::class, 'token']);
});

/*
|--------------------------------------------------------------------------
| Admin — newsroom / moderation
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(['auth:sanctum', 'not.banned', 'admin'])->group(function () {
    Route::get('/stats/overview', [AdminStatsController::class, 'overview']);
    Route::get('/stats/analytics', [AdminStatsController::class, 'analytics']);

    Route::post('/uploads/image', [AdminUploadController::class, 'image']);

    Route::get('/posts/counts', [AdminPostController::class, 'counts']);
    Route::post('/posts/bulk', [AdminPostController::class, 'bulk']);
    Route::get('/posts', [AdminPostController::class, 'index']);
    Route::post('/posts', [AdminPostController::class, 'store']);
    Route::get('/posts/{post}', [AdminPostController::class, 'show']);
    Route::put('/posts/{post}', [AdminPostController::class, 'update']);
    Route::delete('/posts/{post}', [AdminPostController::class, 'destroy']);
    Route::post('/posts/{post}/publish', [AdminPostController::class, 'publish']);
    Route::post('/posts/{post}/reject', [AdminPostController::class, 'reject']);
    Route::post('/posts/{post}/unpublish', [AdminPostController::class, 'unpublish']);

    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy']);

    Route::get('/users', [AdminUserController::class, 'index']);
    Route::get('/users/{user}', [AdminUserController::class, 'show']);
    Route::put('/users/{user}', [AdminUserController::class, 'update']);
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

    Route::get('/comments/counts', [AdminCommentController::class, 'counts']);
    Route::get('/comments', [AdminCommentController::class, 'index']);
    Route::put('/comments/{comment}', [AdminCommentController::class, 'update']);
    Route::delete('/comments/{comment}', [AdminCommentController::class, 'destroy']);

    Route::get('/ads', [AdminAdController::class, 'index']);
    Route::post('/ads', [AdminAdController::class, 'store']);
    Route::put('/ads/{ad}', [AdminAdController::class, 'update']);
    Route::post('/ads/{ad}/toggle', [AdminAdController::class, 'toggle']);
    Route::delete('/ads/{ad}', [AdminAdController::class, 'destroy']);

    Route::get('/announcements', [AdminAnnouncementController::class, 'index']);
    Route::post('/announcements', [AdminAnnouncementController::class, 'store']);
    Route::put('/announcements/{announcement}', [AdminAnnouncementController::class, 'update']);
    Route::post('/announcements/{announcement}/toggle', [AdminAnnouncementController::class, 'toggle']);
    Route::delete('/announcements/{announcement}', [AdminAnnouncementController::class, 'destroy']);

    Route::get('/feedback', [AdminFeedbackController::class, 'index']);
    Route::post('/feedback/{feedback}/reply', [AdminFeedbackController::class, 'reply']);
    Route::post('/feedback/{feedback}/resolve', [AdminFeedbackController::class, 'resolve']);
    Route::delete('/feedback/{feedback}', [AdminFeedbackController::class, 'destroy']);

    Route::post('/feeds/fetch-all', [AdminFeedSourceController::class, 'fetchAll']);
    Route::get('/feeds', [AdminFeedSourceController::class, 'index']);
    Route::post('/feeds', [AdminFeedSourceController::class, 'store']);
    Route::put('/feeds/{feed}', [AdminFeedSourceController::class, 'update']);
    Route::post('/feeds/{feed}/toggle', [AdminFeedSourceController::class, 'toggle']);
    Route::post('/feeds/{feed}/fetch', [AdminFeedSourceController::class, 'fetch']);
    Route::delete('/feeds/{feed}', [AdminFeedSourceController::class, 'destroy']);

    Route::get('/live/counts', [AdminLiveStreamController::class, 'counts']);
    Route::get('/live', [AdminLiveStreamController::class, 'index']);
    Route::post('/live/{stream:room_name}/end', [AdminLiveStreamController::class, 'end']);
    Route::delete('/live/{stream:room_name}', [AdminLiveStreamController::class, 'destroy']);
});

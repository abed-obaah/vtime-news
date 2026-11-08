<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Fired when someone likes a reader's comment. */
class CommentLikeNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Comment $comment, private readonly User $likedBy)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $post = $this->comment->post;

        return [
            'type' => 'comment_like',
            'commentId' => (string) $this->comment->id,
            'postSlug' => $post?->slug,
            'postTitle' => $post?->title,
            'fromName' => $this->likedBy->name,
            'excerpt' => str($this->comment->content)->limit(120)->value(),
        ];
    }
}

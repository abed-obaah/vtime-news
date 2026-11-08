<?php

namespace App\Notifications;

use App\Models\Comment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Fired when someone replies to a reader's comment. */
class CommentReplyNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Comment $reply)
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
        $post = $this->reply->post;

        return [
            'type' => 'comment_reply',
            'commentId' => (string) $this->reply->id,
            'parentCommentId' => $this->reply->parent_id ? (string) $this->reply->parent_id : null,
            'postSlug' => $post?->slug,
            'postTitle' => $post?->title,
            'fromName' => $this->reply->author_name,
            'excerpt' => str($this->reply->content)->limit(120)->value(),
        ];
    }
}

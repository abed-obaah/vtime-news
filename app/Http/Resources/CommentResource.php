<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'postId' => (string) $this->post_id,
            'parentId' => $this->parent_id ? (string) $this->parent_id : null,
            'userId' => $this->user_id ? (string) $this->user_id : null,
            'userName' => $this->displayName(),
            'content' => $this->content,
            'status' => $this->status,
            'likes' => (int) $this->likes_count,
            'reports' => (int) $this->reports_count,
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'postTitle' => $this->whenLoaded('post', fn () => $this->post?->title, null),
            'postSlug' => $this->whenLoaded('post', fn () => $this->post?->slug, null),
            'replies' => CommentResource::collection($this->whenLoaded('replies')),
        ];
    }
}

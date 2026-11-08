<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class PostDetailResource extends PostResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'content' => $this->content,
            'reviewNote' => $this->review_note,
            'reviewedAt' => optional($this->reviewed_at)->toIso8601String(),
            'reviewedBy' => $this->whenLoaded('reviewer', fn () => $this->reviewer?->name, null),
            'feedSourceId' => $this->feed_source_id,
            'viewer' => [
                'liked' => (bool) ($this->viewer_liked ?? false),
                'saved' => (bool) ($this->viewer_saved ?? false),
                'rating' => (int) ($this->viewer_rating ?? 0),
            ],
        ]);
    }
}

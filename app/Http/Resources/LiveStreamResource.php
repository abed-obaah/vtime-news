<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiveStreamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var \App\Models\LiveStream $this */
        return [
            'id' => (string) $this->id,
            'roomName' => $this->room_name,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'host' => [
                'id' => (string) $this->user_id,
                'name' => $this->whenLoaded('host', fn () => $this->host?->name, null),
                'avatar' => $this->whenLoaded('host', fn () => $this->host?->avatar, null),
            ],
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'slug' => $this->category->slug,
                'name' => $this->category->name,
                'color' => $this->category->color,
            ] : null, null),
            'viewerCount' => (int) ($this->viewer_count ?? 0),
            'peakViewers' => (int) $this->peak_viewers,
            'startedAt' => optional($this->started_at)->toIso8601String(),
            'endedAt' => optional($this->ended_at)->toIso8601String(),
            'endReason' => $this->end_reason,
            'isMine' => $request->user()?->id === $this->user_id,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeedSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'website' => $this->website,
            'categoryId' => $this->category_id,
            'categoryName' => $this->whenLoaded('category', fn () => $this->category?->name, null),
            'isActive' => (bool) $this->is_active,
            'autoPublish' => (bool) $this->auto_publish,
            'fetchIntervalMinutes' => (int) $this->fetch_interval_minutes,
            'lastFetchedAt' => optional($this->last_fetched_at)->toIso8601String(),
            'lastStatus' => $this->last_status,
            'lastError' => $this->last_error,
            'itemsImported' => (int) $this->items_imported,
            'postsCount' => $this->when(isset($this->posts_count), fn () => (int) $this->posts_count),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}

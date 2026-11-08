<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The list/card shape. Article body is only attached by PostDetailResource.
 */
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'image' => $this->image,
            'category' => $this->whenLoaded('category', fn () => $this->category?->slug, null),
            'categoryId' => $this->category_id,
            'categoryName' => $this->whenLoaded('category', fn () => $this->category?->name, null),
            'categoryColor' => $this->whenLoaded('category', fn () => $this->category?->color, null),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('slug')->all(), []),
            'author' => $this->author,
            'status' => $this->status,
            'source' => $this->source,
            'sourceName' => $this->source_name,
            'sourceUrl' => $this->source_url,
            'publishedAt' => optional($this->published_at ?? $this->created_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'updatedAt' => optional($this->updated_at)->toIso8601String(),
            'readTime' => (int) $this->read_time,
            'views' => (int) $this->views,
            'likes' => (int) $this->likes_count,
            'commentsCount' => (int) $this->comments_count,
            'rating' => $this->rating,
            'ratingCount' => (int) $this->rating_count,
            'isFeatured' => (bool) $this->is_featured,
            'isBreaking' => (bool) $this->is_breaking,
        ];
    }
}

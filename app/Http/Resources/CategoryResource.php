<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'color' => $this->color,
            'description' => $this->description,
            'sortOrder' => $this->sort_order,
            'isActive' => (bool) $this->is_active,
            'postsCount' => $this->when(isset($this->posts_count), fn () => (int) $this->posts_count),
        ];
    }
}

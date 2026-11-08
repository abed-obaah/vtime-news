<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    /** Tag cloud: the most-used tags across published stories. */
    public function index(): JsonResponse
    {
        $tags = Tag::query()
            ->withCount(['posts' => fn ($q) => $q->published()])
            ->whereHas('posts', fn ($q) => $q->published())
            ->orderByDesc('posts_count')
            ->limit(40)
            ->get()
            ->map(fn (Tag $tag) => [
                'id' => (string) $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'postsCount' => (int) $tag->posts_count,
            ]);

        return response()->json(['data' => $tags]);
    }
}

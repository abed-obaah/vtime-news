<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'content'     => ['required', 'string', 'max:20000'],
            'author_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'excerpt'     => ['sometimes', 'nullable', 'string', 'max:500'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'image'       => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);

        $content = HtmlSanitizer::clean($data['content']);

        $author = trim($data['author_name'] ?? '')
            ?: ($request->user()?->name ?? 'Anonymous');

        $post = Post::create([
            'title'       => $data['title'],
            'slug'        => Post::uniqueSlug($data['title']),
            'excerpt'     => $data['excerpt'] ?? HtmlSanitizer::toText($content, 260),
            'content'     => $content,
            'image'       => $data['image'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'author'      => $author,
            'status'      => 'pending',
            'source'      => 'user',
            'created_by'  => $request->user()?->id,
            'read_time'   => max(1, (int) ceil(str_word_count(strip_tags($content)) / 200)),
        ]);

        return response()->json([
            'message' => 'Your story has been submitted for review. We\'ll notify you once it\'s approved.',
            'data'    => ['id' => $post->id, 'title' => $post->title, 'status' => $post->status],
        ], 201);
    }
}

<?php

namespace Tests;

use App\Models\Category;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    protected function admin(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Admin',
            'email' => 'admin-'.Str::random(6).'@pulsenews.test',
            'password' => 'secret123',
            'role' => 'admin',
            'status' => 'active',
        ], $attributes));
    }

    protected function reader(array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Reader',
            'email' => 'reader-'.Str::random(6).'@pulsenews.test',
            'password' => 'secret123',
            'role' => 'user',
            'status' => 'active',
        ], $attributes));
    }

    protected function category(array $attributes = []): Category
    {
        return Category::create(array_merge([
            'name' => 'World',
            'slug' => 'world',
            'color' => '#3B82F6',
            'description' => 'Global news',
        ], $attributes));
    }

    protected function makePost(array $attributes = []): Post
    {
        $title = $attributes['title'] ?? 'A Story About '.Str::random(8);

        return Post::create(array_merge([
            'title' => $title,
            'slug' => Post::uniqueSlug($title),
            'excerpt' => 'Short summary of the story.',
            'content' => '<p>The body of the story.</p>',
            'image' => 'https://example.com/image.jpg',
            'author' => 'PulseNews',
            'status' => 'published',
            'source' => 'manual',
            'read_time' => 4,
            'published_at' => now()->subHour(),
        ], $attributes));
    }
}

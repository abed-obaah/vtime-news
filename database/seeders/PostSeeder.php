<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;
use App\Services\HtmlSanitizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Loads the launch archive that shipped with the front-end mockup so the
 * site has real content the moment it boots.
 */
class PostSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/posts.json');

        if (! is_file($path)) {
            $this->command?->warn('No seed archive at database/seeders/data/posts.json — skipping.');

            return;
        }

        $rows = json_decode((string) file_get_contents($path), true);

        if (! is_array($rows)) {
            $this->command?->warn('Seed archive could not be decoded — skipping.');

            return;
        }

        $categoryIds = Category::pluck('id', 'slug');
        $admin = User::where('role', 'admin')->first();

        foreach ($rows as $row) {
            $slug = $row['slug'] ?? Post::uniqueSlug($row['title']);

            $post = Post::updateOrCreate(
                ['slug' => $slug],
                [
                    'title' => $row['title'],
                    'excerpt' => $row['excerpt'] ?? HtmlSanitizer::toText($row['content'] ?? '', 260),
                    'content' => HtmlSanitizer::clean($row['content'] ?? ''),
                    'image' => $row['image'] ?? null,
                    'category_id' => $categoryIds[$row['category']] ?? null,
                    'author' => $row['author'] ?? 'PulseNews',
                    'status' => $row['status'] ?? 'published',
                    'source' => 'manual',
                    'read_time' => (int) ($row['readTime'] ?? 5),
                    'is_featured' => (bool) ($row['isFeatured'] ?? false),
                    'is_breaking' => (bool) ($row['isBreaking'] ?? false),
                    'published_at' => isset($row['publishedAt']) ? Carbon::parse($row['publishedAt']) : now(),
                    'created_by' => $admin?->id,
                    'reviewed_by' => $admin?->id,
                    'reviewed_at' => isset($row['publishedAt']) ? Carbon::parse($row['publishedAt']) : now(),
                ]
            );

            // Views/likes are counters, not fillable — set them straight.
            $post->forceFill([
                'views' => (int) ($row['views'] ?? 0),
                'likes_count' => (int) ($row['likes'] ?? 0),
            ])->saveQuietly();

            $tagIds = [];

            foreach ((array) ($row['tags'] ?? []) as $name) {
                $tag = Tag::fromName((string) $name);

                if ($tag) {
                    $tagIds[] = $tag->id;
                }
            }

            $post->tags()->sync(array_unique($tagIds));
        }
    }
}

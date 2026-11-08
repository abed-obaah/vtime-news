<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'World', 'slug' => 'world', 'color' => '#3B82F6', 'description' => 'Global news and international affairs'],
            ['name' => 'Politics', 'slug' => 'politics', 'color' => '#8B5CF6', 'description' => 'Political news and government updates'],
            ['name' => 'Technology', 'slug' => 'technology', 'color' => '#06B6D4', 'description' => 'Tech industry news and innovations'],
            ['name' => 'Business', 'slug' => 'business', 'color' => '#10B981', 'description' => 'Business, finance, and market news'],
            ['name' => 'Science', 'slug' => 'science', 'color' => '#F59E0B', 'description' => 'Scientific discoveries and research'],
            ['name' => 'Health', 'slug' => 'health', 'color' => '#EF4444', 'description' => 'Health, medicine, and wellness news'],
            ['name' => 'Sports', 'slug' => 'sports', 'color' => '#F97316', 'description' => 'Sports scores, news, and analysis'],
            ['name' => 'Entertainment', 'slug' => 'entertainment', 'color' => '#EC4899', 'description' => 'Movies, music, TV, and celebrity news'],
            ['name' => 'Opinion', 'slug' => 'opinion', 'color' => '#6366F1', 'description' => 'Editorials and opinion pieces'],
            ['name' => 'Environment', 'slug' => 'environment', 'color' => '#22C55E', 'description' => 'Climate change and environmental stories'],
        ];

        foreach ($categories as $index => $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category + ['sort_order' => $index, 'is_active' => true]
            );
        }
    }
}

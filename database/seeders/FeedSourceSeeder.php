<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\FeedSource;
use Illuminate\Database\Seeder;

class FeedSourceSeeder extends Seeder
{
    public function run(): void
    {
        $feeds = [
            ['name' => 'BBC News — World', 'url' => 'https://feeds.bbci.co.uk/news/world/rss.xml', 'website' => 'https://www.bbc.com/news', 'category' => 'world'],
            ['name' => 'BBC News — Technology', 'url' => 'https://feeds.bbci.co.uk/news/technology/rss.xml', 'website' => 'https://www.bbc.com/news/technology', 'category' => 'technology'],
            ['name' => 'BBC News — Business', 'url' => 'https://feeds.bbci.co.uk/news/business/rss.xml', 'website' => 'https://www.bbc.com/news/business', 'category' => 'business'],
            ['name' => 'BBC News — Health', 'url' => 'https://feeds.bbci.co.uk/news/health/rss.xml', 'website' => 'https://www.bbc.com/news/health', 'category' => 'health'],
            ['name' => 'BBC Sport', 'url' => 'https://feeds.bbci.co.uk/sport/rss.xml', 'website' => 'https://www.bbc.com/sport', 'category' => 'sports'],
            ['name' => 'BBC News — Science & Environment', 'url' => 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'website' => 'https://www.bbc.com/news/science_and_environment', 'category' => 'science'],
            ['name' => 'NPR — World', 'url' => 'https://feeds.npr.org/1004/rss.xml', 'website' => 'https://www.npr.org', 'category' => 'world'],
            ['name' => 'NPR — Politics', 'url' => 'https://feeds.npr.org/1014/rss.xml', 'website' => 'https://www.npr.org/sections/politics', 'category' => 'politics'],
            ['name' => 'Al Jazeera — All News', 'url' => 'https://www.aljazeera.com/xml/rss/all.xml', 'website' => 'https://www.aljazeera.com', 'category' => 'world'],
            ['name' => 'The Guardian — World', 'url' => 'https://www.theguardian.com/world/rss', 'website' => 'https://www.theguardian.com', 'category' => 'world'],
            ['name' => 'The Guardian — Environment', 'url' => 'https://www.theguardian.com/environment/rss', 'website' => 'https://www.theguardian.com/environment', 'category' => 'environment'],
            ['name' => 'Ars Technica', 'url' => 'https://feeds.arstechnica.com/arstechnica/index', 'website' => 'https://arstechnica.com', 'category' => 'technology'],
            ['name' => 'Sky News — Entertainment', 'url' => 'https://feeds.skynews.com/feeds/rss/entertainment.xml', 'website' => 'https://news.sky.com', 'category' => 'entertainment'],
            ['name' => 'Science Daily — Top News', 'url' => 'https://www.sciencedaily.com/rss/top/science.xml', 'website' => 'https://www.sciencedaily.com', 'category' => 'science'],
        ];

        $categoryIds = Category::pluck('id', 'slug');

        foreach ($feeds as $feed) {
            FeedSource::updateOrCreate(
                ['url_hash' => hash('sha256', rtrim($feed['url'], '/'))],
                [
                    'name' => $feed['name'],
                    'url' => $feed['url'],
                    'website' => $feed['website'],
                    'category_id' => $categoryIds[$feed['category']] ?? null,
                    'is_active' => true,
                    'auto_publish' => false,
                    'fetch_interval_minutes' => 60,
                ]
            );
        }
    }
}

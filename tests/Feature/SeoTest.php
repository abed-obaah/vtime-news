<?php

namespace Tests\Feature;

use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // these endpoints cache their output
    }

    public function test_robots_points_at_the_sitemaps_and_shields_private_areas(): void
    {
        $response = $this->get('/robots.txt')->assertOk();
        $body = $response->getContent();

        $this->assertStringContainsString('Sitemap: ', $body);
        $this->assertStringContainsString('/sitemap.xml', $body);
        $this->assertStringContainsString('/news-sitemap.xml', $body);
        $this->assertStringContainsString('Disallow: /onlyadmindashboard', $body);
        $this->assertStringContainsString('Disallow: /api/', $body);
    }

    public function test_the_sitemap_lists_published_stories_but_not_drafts(): void
    {
        $category = $this->category();
        $live = $this->makePost(['title' => 'Indexed story', 'category_id' => $category->id]);
        $draft = $this->makePost(['title' => 'Hidden story', 'status' => 'draft', 'published_at' => null]);

        $body = $this->get('/sitemap.xml')->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('/article/'.$live->slug, $body);
        $this->assertStringNotContainsString('/article/'.$draft->slug, $body);
        $this->assertStringContainsString('/category/world', $body);
    }

    public function test_the_sitemap_lists_the_static_site_pages(): void
    {
        $body = $this->get('/sitemap.xml')->getContent();

        foreach (['about', 'ethics', 'privacy', 'terms', 'cookies', 'accessibility', 'contact'] as $page) {
            $this->assertStringContainsString('/'.$page.'</loc>', $body, "sitemap should list /{$page}");
        }
    }

    public function test_the_sitemap_includes_tags_that_have_published_stories(): void
    {
        $post = $this->makePost();
        $post->tags()->sync([Tag::fromName('climate')->id]);

        $orphan = Tag::fromName('never-used');

        $body = $this->get('/sitemap.xml')->getContent();

        $this->assertStringContainsString('/tag/climate', $body);
        $this->assertStringNotContainsString('/tag/'.$orphan->slug, $body);
    }

    public function test_the_news_sitemap_only_covers_the_last_48_hours(): void
    {
        $fresh = $this->makePost(['title' => 'Just published', 'published_at' => now()->subHour()]);
        $old = $this->makePost(['title' => 'Last week', 'published_at' => now()->subDays(7)]);

        $body = $this->get('/news-sitemap.xml')->assertOk()->getContent();

        $this->assertStringContainsString('news:publication_date', $body);
        $this->assertStringContainsString($fresh->title, $body);
        $this->assertStringNotContainsString($old->title, $body);
    }

    public function test_the_rss_feed_is_valid_and_lists_published_stories(): void
    {
        $category = $this->category();
        $post = $this->makePost(['title' => 'Syndicated story', 'category_id' => $category->id]);
        $this->makePost(['title' => 'Not syndicated', 'status' => 'pending', 'published_at' => null]);

        $body = $this->get('/feed.xml')->assertOk()
            ->assertHeader('Content-Type', 'application/rss+xml; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('<rss version="2.0"', $body);
        $this->assertStringContainsString('Syndicated story', $body);
        $this->assertStringNotContainsString('Not syndicated', $body);
        $this->assertStringContainsString('/article/'.$post->slug, $body);

        // It has to actually parse as XML.
        $xml = simplexml_load_string($body);
        $this->assertNotFalse($xml);
        $this->assertSame(1, $xml->channel->item->count());
    }

    public function test_a_section_feed_only_carries_that_section(): void
    {
        $world = $this->category();
        $tech = $this->category(['name' => 'Tech', 'slug' => 'technology']);

        $this->makePost(['title' => 'World story', 'category_id' => $world->id]);
        $this->makePost(['title' => 'Tech story', 'category_id' => $tech->id]);

        $body = $this->get('/feed/technology.xml')->assertOk()->getContent();

        $this->assertStringContainsString('Tech story', $body);
        $this->assertStringNotContainsString('World story', $body);
    }

    public function test_an_unknown_section_feed_is_a_404(): void
    {
        $this->get('/feed/no-such-section.xml')->assertNotFound();
    }

    public function test_feed_output_escapes_special_characters(): void
    {
        $this->makePost([
            'title' => 'Markets rise & fall <fast>',
            'excerpt' => 'Quotes "like this" and 5 < 6',
        ]);

        $body = $this->get('/feed.xml')->getContent();

        $this->assertStringNotContainsString('<fast>', $body);
        $this->assertNotFalse(simplexml_load_string($body), 'Feed must stay well-formed.');
    }
}

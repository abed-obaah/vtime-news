<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\FeedSource;
use App\Models\Post;
use App\Services\RssIngestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RssIngestTest extends TestCase
{
    use RefreshDatabase;

    private function rss(string $items): string
    {
        return <<<XML
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel>
            <title>Test Wire</title>
            {$items}
          </channel>
        </rss>
        XML;
    }

    private function atom(string $entries): string
    {
        return <<<XML
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Wire</title>
          {$entries}
        </feed>
        XML;
    }

    private function source(array $attributes = []): FeedSource
    {
        return FeedSource::create(array_merge([
            'name' => 'Test Wire',
            'url' => 'https://wire.example.com/rss.xml',
            'is_active' => true,
        ], $attributes));
    }

    public function test_it_imports_rss_items_into_the_moderation_queue(): void
    {
        $body = $this->rss(<<<'XML'
            <item>
              <title>Flood warnings issued across three counties</title>
              <link>https://wire.example.com/flood-warnings</link>
              <guid>wire-0001</guid>
              <description>Residents told to move valuables upstairs.</description>
              <content:encoded><![CDATA[<p>The river burst its banks overnight.</p><script>alert(1)</script>]]></content:encoded>
              <pubDate>Mon, 01 Sep 2026 08:00:00 GMT</pubDate>
              <dc:creator>Wire Staff</dc:creator>
              <category>Environment</category>
              <media:content url="https://wire.example.com/flood.jpg" type="image/jpeg" />
            </item>
        XML);

        Http::fake(['*' => Http::response($body, 200)]);

        $source = $this->source();
        $result = app(RssIngestService::class)->fetchSource($source);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['imported']);

        $post = Post::first();

        $this->assertSame('Flood warnings issued across three counties', $post->title);
        $this->assertSame('pending', $post->status, 'Imported stories must wait for an editor.');
        $this->assertSame('rss', $post->source);
        $this->assertSame('Test Wire', $post->source_name);
        $this->assertSame('https://wire.example.com/flood-warnings', $post->source_url);
        $this->assertSame('https://wire.example.com/flood.jpg', $post->image);
        $this->assertSame('Wire Staff', $post->author);
        $this->assertStringContainsString('burst its banks', $post->content);
        $this->assertStringNotContainsString('script', $post->content);
        $this->assertSame('Residents told to move valuables upstairs.', $post->excerpt);
        $this->assertSame('2026-09-01', $post->published_at->toDateString());
        $this->assertNull($post->reviewed_at);

        $source->refresh();
        $this->assertSame('ok', $source->last_status);
        $this->assertSame(1, $source->items_imported);
        $this->assertNotNull($source->last_fetched_at);
    }

    public function test_imported_stories_are_invisible_to_readers_until_published(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Not ready yet</title>
              <link>https://wire.example.com/a</link>
              <guid>a</guid>
              <description>Waiting on the desk.</description>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source());

        $this->assertCount(0, $this->getJson('/api/posts')->json('data'));

        $post = Post::first();
        $this->getJson("/api/posts/{$post->slug}")->assertStatus(404);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/posts/{$post->id}/publish")
            ->assertOk();

        $this->assertCount(1, $this->getJson('/api/posts')->json('data'));
    }

    public function test_the_same_item_is_never_imported_twice(): void
    {
        $body = $this->rss(<<<'XML'
            <item>
              <title>Repeat story</title>
              <link>https://wire.example.com/repeat</link>
              <guid>repeat-1</guid>
              <description>Same every time.</description>
            </item>
        XML);

        Http::fake(['*' => Http::response($body, 200)]);

        $source = $this->source();
        $service = app(RssIngestService::class);

        $this->assertSame(1, $service->fetchSource($source)['imported']);

        $second = $service->fetchSource($source->fresh());
        $this->assertSame(0, $second['imported']);
        $this->assertSame(1, $second['skipped']);

        $this->assertSame(1, Post::count());
    }

    public function test_a_feed_that_reuses_a_guid_across_sources_still_imports(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Shared guid story</title>
              <link>https://wire.example.com/shared</link>
              <guid>1</guid>
              <description>Two outlets, one id.</description>
            </item>
        XML), 200)]);

        $service = app(RssIngestService::class);

        $service->fetchSource($this->source());
        $service->fetchSource($this->source(['name' => 'Other Wire', 'url' => 'https://other.example.com/rss.xml']));

        $this->assertSame(2, Post::count());
    }

    public function test_it_parses_atom_feeds(): void
    {
        Http::fake(['*' => Http::response($this->atom(<<<'XML'
            <entry>
              <title>Atom headline</title>
              <link rel="alternate" href="https://atom.example.com/story" />
              <id>urn:uuid:1234</id>
              <published>2026-08-30T12:00:00Z</published>
              <summary>A short summary.</summary>
              <content type="html">&lt;p&gt;Atom body copy.&lt;/p&gt;</content>
            </entry>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source());

        $post = Post::first();

        $this->assertSame('Atom headline', $post->title);
        $this->assertSame('https://atom.example.com/story', $post->source_url);
        $this->assertStringContainsString('Atom body copy', $post->content);
    }

    public function test_it_maps_feed_categories_onto_our_sections(): void
    {
        $environment = Category::create(['name' => 'Environment', 'slug' => 'environment', 'color' => '#22C55E']);

        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Mapped by category</title>
              <link>https://wire.example.com/mapped</link>
              <guid>mapped-1</guid>
              <description>Body.</description>
              <category>Environment</category>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source());

        $post = Post::first();

        $this->assertSame($environment->id, $post->category_id);
        $this->assertSame(['environment'], $post->tags->pluck('slug')->all());
    }

    public function test_the_feeds_own_section_wins_over_the_item_category(): void
    {
        Category::create(['name' => 'Environment', 'slug' => 'environment', 'color' => '#22C55E']);
        $tech = Category::create(['name' => 'Technology', 'slug' => 'technology', 'color' => '#06B6D4']);

        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Forced into tech</title>
              <link>https://wire.example.com/forced</link>
              <guid>forced-1</guid>
              <description>Body.</description>
              <category>Environment</category>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source(['category_id' => $tech->id]));

        $this->assertSame($tech->id, Post::first()->category_id);
    }

    public function test_an_auto_publish_feed_goes_straight_to_the_site(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Trusted wire story</title>
              <link>https://wire.example.com/trusted</link>
              <guid>trusted-1</guid>
              <description>Straight through.</description>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source(['auto_publish' => true]));

        $post = Post::first();

        $this->assertSame('published', $post->status);
        $this->assertNotNull($post->published_at);
        $this->assertCount(1, $this->getJson('/api/posts')->json('data'));
    }

    public function test_a_future_dated_item_is_pulled_back_to_now(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>From the future</title>
              <link>https://wire.example.com/future</link>
              <guid>future-1</guid>
              <description>Bad timezone data.</description>
              <pubDate>Mon, 01 Sep 2099 08:00:00 GMT</pubDate>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source(['auto_publish' => true]));

        $this->assertTrue(Post::first()->published_at->lte(now()->addMinute()));
        $this->assertCount(1, $this->getJson('/api/posts')->json('data'));
    }

    public function test_an_http_failure_is_recorded_on_the_source(): void
    {
        Http::fake(['*' => Http::response('nope', 503)]);

        $source = $this->source();
        $result = app(RssIngestService::class)->fetchSource($source);

        $this->assertFalse($result['ok']);
        $this->assertSame('failed', $source->fresh()->last_status);
        $this->assertStringContainsString('503', $source->fresh()->last_error);
        $this->assertSame(0, Post::count());
    }

    public function test_a_malformed_feed_is_recorded_rather_than_crashing(): void
    {
        Http::fake(['*' => Http::response('<html><body>not a feed</body></html>', 200)]);

        $source = $this->source();
        $result = app(RssIngestService::class)->fetchSource($source);

        $this->assertFalse($result['ok']);
        $this->assertSame('failed', $source->fresh()->last_status);
        $this->assertSame(0, Post::count());
    }

    public function test_items_without_a_title_are_skipped(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <link>https://wire.example.com/untitled</link>
              <guid>untitled-1</guid>
              <description>No headline here.</description>
            </item>
            <item>
              <title>Has a headline</title>
              <link>https://wire.example.com/titled</link>
              <guid>titled-1</guid>
              <description>Fine.</description>
            </item>
        XML), 200)]);

        app(RssIngestService::class)->fetchSource($this->source());

        $this->assertSame(1, Post::count());
    }

    public function test_fetch_all_respects_the_interval_unless_forced(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Interval story</title>
              <link>https://wire.example.com/interval</link>
              <guid>interval-1</guid>
              <description>Body.</description>
            </item>
        XML), 200)]);

        $source = $this->source(['fetch_interval_minutes' => 60]);
        $service = app(RssIngestService::class);

        $this->assertSame(1, $service->fetchAll()['sources']);

        // Just fetched — not due again yet.
        $this->assertSame(0, $service->fetchAll()['sources']);

        // Forcing ignores the interval.
        $this->assertSame(1, $service->fetchAll(force: true)['sources']);
    }

    public function test_paused_feeds_are_never_fetched(): void
    {
        Http::fake(['*' => Http::response($this->rss('<item><title>x</title><guid>x</guid></item>'), 200)]);

        $this->source(['is_active' => false]);

        $this->assertSame(0, app(RssIngestService::class)->fetchAll(force: true)['sources']);
        $this->assertSame(0, Post::count());
    }

    public function test_an_admin_can_trigger_a_fetch_from_the_panel(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Fetched on demand</title>
              <link>https://wire.example.com/on-demand</link>
              <guid>on-demand-1</guid>
              <description>Body.</description>
            </item>
        XML), 200)]);

        $source = $this->source();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feeds/{$source->id}/fetch")
            ->assertOk()
            ->assertJsonPath('result.imported', 1);

        $this->assertSame(1, Post::where('status', 'pending')->count());
    }

    public function test_an_admin_can_fetch_every_feed_at_once(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Bulk fetched</title>
              <link>https://wire.example.com/bulk</link>
              <guid>bulk-1</guid>
              <description>Body.</description>
            </item>
        XML), 200)]);

        $this->source();
        $this->source(['name' => 'Second', 'url' => 'https://second.example.com/rss.xml']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/feeds/fetch-all')
            ->assertOk()
            ->assertJsonPath('summary.sources', 2)
            ->assertJsonPath('summary.imported', 2);
    }

    public function test_feed_sources_can_be_managed_from_the_panel(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/feeds', [
            'name' => 'Reuters World',
            'url' => 'https://reuters.example.com/world/rss',
            'fetch_interval_minutes' => 30,
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertTrue($created->json('data.isActive'));

        // The same URL cannot be added twice.
        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/feeds', [
            'name' => 'Duplicate',
            'url' => 'https://reuters.example.com/world/rss',
        ])->assertStatus(422)->assertJsonValidationErrors('url');

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/feeds/{$id}/toggle")
            ->assertOk()->assertJsonPath('data.isActive', false);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/feeds/{$id}", ['name' => 'Reuters — World'])
            ->assertOk()->assertJsonPath('data.name', 'Reuters — World');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/feeds/{$id}")->assertOk();
        $this->assertDatabaseCount('feed_sources', 0);
    }

    public function test_removing_a_feed_keeps_the_stories_it_imported(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>Orphan story</title>
              <link>https://wire.example.com/orphan</link>
              <guid>orphan-1</guid>
              <description>Body.</description>
            </item>
        XML), 200)]);

        $source = $this->source();
        app(RssIngestService::class)->fetchSource($source);

        $this->actingAs($this->admin(), 'sanctum')->deleteJson("/api/admin/feeds/{$source->id}")->assertOk();

        $this->assertSame(1, Post::count());
        $this->assertNull(Post::first()->feed_source_id);
    }

    public function test_the_artisan_command_runs_the_pipeline(): void
    {
        Http::fake(['*' => Http::response($this->rss(<<<'XML'
            <item>
              <title>From the scheduler</title>
              <link>https://wire.example.com/scheduled</link>
              <guid>scheduled-1</guid>
              <description>Body.</description>
            </item>
        XML), 200)]);

        $this->source();

        $this->artisan('rss:fetch --force')->assertSuccessful();

        $this->assertSame(1, Post::where('status', 'pending')->count());
    }

    public function test_the_command_reports_an_unknown_source(): void
    {
        $this->artisan('rss:fetch --source=999')->assertFailed();
    }
}

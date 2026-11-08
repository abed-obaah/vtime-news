<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_responds(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('ok', true);
    }

    public function test_categories_are_listed_with_published_counts(): void
    {
        $world = $this->category();
        $this->category(['name' => 'Tech', 'slug' => 'technology']);
        $this->category(['name' => 'Hidden', 'slug' => 'hidden', 'is_active' => false]);

        $this->makePost(['category_id' => $world->id]);
        $this->makePost(['category_id' => $world->id, 'status' => 'draft', 'published_at' => null]);

        $response = $this->getJson('/api/categories')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(1, collect($response->json('data'))->firstWhere('slug', 'world')['postsCount']);
    }

    public function test_only_published_posts_are_public(): void
    {
        $category = $this->category();

        $this->makePost(['title' => 'Live story', 'category_id' => $category->id]);
        $this->makePost(['title' => 'Waiting story', 'status' => 'pending', 'published_at' => null]);
        $this->makePost(['title' => 'Rejected story', 'status' => 'rejected', 'published_at' => null]);
        $this->makePost(['title' => 'Scheduled story', 'status' => 'published', 'published_at' => now()->addDay()]);

        $response = $this->getJson('/api/posts')->assertOk();
        $titles = collect($response->json('data'))->pluck('title');

        $this->assertTrue($titles->contains('Live story'));
        $this->assertFalse($titles->contains('Waiting story'));
        $this->assertFalse($titles->contains('Rejected story'));
        $this->assertFalse($titles->contains('Scheduled story'));
    }

    public function test_posts_can_be_filtered_by_category_tag_and_search(): void
    {
        $world = $this->category();
        $tech = $this->category(['name' => 'Tech', 'slug' => 'technology']);

        $a = $this->makePost(['title' => 'Climate talks open in Geneva', 'category_id' => $world->id]);
        $b = $this->makePost(['title' => 'A quantum chip breakthrough', 'category_id' => $tech->id]);

        $tag = Tag::fromName('climate');
        $a->tags()->sync([$tag->id]);

        $this->assertCount(1, $this->getJson('/api/posts?category=world')->assertOk()->json('data'));
        $this->assertCount(1, $this->getJson('/api/posts?tag=climate')->assertOk()->json('data'));

        $search = $this->getJson('/api/posts?q=quantum')->assertOk()->json('data');
        $this->assertCount(1, $search);
        $this->assertSame($b->title, $search[0]['title']);

        $this->assertCount(0, $this->getJson('/api/posts?q=nothing-matches-this')->assertOk()->json('data'));
    }

    public function test_posts_can_be_sorted(): void
    {
        $old = $this->makePost(['title' => 'Older', 'published_at' => now()->subDays(5)]);
        $new = $this->makePost(['title' => 'Newer', 'published_at' => now()->subHour()]);
        $old->forceFill(['views' => 900])->saveQuietly();

        $latest = $this->getJson('/api/posts?sort=latest')->json('data');
        $this->assertSame('Newer', $latest[0]['title']);

        $trending = $this->getJson('/api/posts?sort=trending')->json('data');
        $this->assertSame('Older', $trending[0]['title']);

        $this->assertSame('Older', $this->getJson('/api/posts?sort=oldest')->json('data')[0]['title']);
        $this->getJson('/api/posts?sort=top-rated')->assertOk();
        $this->getJson('/api/posts?sort=most-liked')->assertOk();
    }

    public function test_featured_and_breaking_filters_work(): void
    {
        $this->makePost(['title' => 'Featured one', 'is_featured' => true]);
        $this->makePost(['title' => 'Breaking one', 'is_breaking' => true]);
        $this->makePost(['title' => 'Ordinary one']);

        $this->assertCount(1, $this->getJson('/api/posts?featured=1')->json('data'));
        $this->assertCount(1, $this->getJson('/api/posts?breaking=1')->json('data'));
    }

    public function test_home_endpoint_returns_every_section(): void
    {
        $category = $this->category();
        $this->makePost(['title' => 'Featured', 'is_featured' => true, 'category_id' => $category->id]);
        $this->makePost(['title' => 'Breaking', 'is_breaking' => true, 'category_id' => $category->id]);

        $response = $this->getJson('/api/home')->assertOk();

        $response->assertJsonStructure([
            'data' => ['featured', 'latest', 'trending', 'editorPicks', 'breaking', 'sections'],
        ]);

        $this->assertCount(1, $response->json('data.featured'));
        $this->assertCount(1, $response->json('data.sections'));
        $this->assertSame('world', $response->json('data.sections.0.category.slug'));
    }

    public function test_an_article_can_be_read_and_counts_one_view_per_visitor_per_day(): void
    {
        $post = $this->makePost(['title' => 'Read me']);

        $this->getJson("/api/posts/{$post->slug}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Read me')
            ->assertJsonPath('data.viewer.liked', false)
            ->assertJsonStructure(['data' => ['content', 'tags', 'viewer' => ['liked', 'saved', 'rating']]]);

        $this->assertSame(1, $post->fresh()->views);

        $this->getJson("/api/posts/{$post->slug}");
        $this->assertSame(1, $post->fresh()->views, 'A repeat read on the same day should not add a view.');
    }

    public function test_an_unknown_article_returns_404(): void
    {
        $this->getJson('/api/posts/does-not-exist')->assertStatus(404);
    }

    public function test_a_draft_article_is_not_readable_by_the_public(): void
    {
        $post = $this->makePost(['status' => 'draft', 'published_at' => null]);

        $this->getJson("/api/posts/{$post->slug}")->assertStatus(404);
    }

    public function test_related_stories_prefer_the_same_category(): void
    {
        $world = $this->category();
        $tech = $this->category(['name' => 'Tech', 'slug' => 'technology']);

        $post = $this->makePost(['title' => 'Anchor', 'category_id' => $world->id]);
        $this->makePost(['title' => 'Same section', 'category_id' => $world->id]);
        $this->makePost(['title' => 'Other section', 'category_id' => $tech->id]);

        $related = $this->getJson("/api/posts/{$post->slug}/related")->assertOk()->json('data');

        $this->assertCount(1, $related);
        $this->assertSame('Same section', $related[0]['title']);
    }

    public function test_comments_are_returned_nested_and_only_when_approved(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $parent = Comment::create([
            'post_id' => $post->id, 'user_id' => $user->id, 'content' => 'Top level', 'status' => 'approved',
        ]);
        Comment::create([
            'post_id' => $post->id, 'user_id' => $user->id, 'parent_id' => $parent->id, 'content' => 'A reply', 'status' => 'approved',
        ]);
        Comment::create([
            'post_id' => $post->id, 'user_id' => $user->id, 'content' => 'Hidden', 'status' => 'pending',
        ]);

        $response = $this->getJson("/api/posts/{$post->slug}/comments")->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Top level', $response->json('data.0.content'));
        $this->assertCount(1, $response->json('data.0.replies'));
        $this->assertSame('A reply', $response->json('data.0.replies.0.content'));
    }

    public function test_ads_are_listed_by_placement_and_respect_scheduling(): void
    {
        Ad::create(['title' => 'Live sidebar', 'placement' => 'sidebar', 'is_active' => true, 'link' => '#']);
        Ad::create(['title' => 'Paused', 'placement' => 'sidebar', 'is_active' => false, 'link' => '#']);
        Ad::create(['title' => 'Expired', 'placement' => 'sidebar', 'is_active' => true, 'link' => '#', 'ends_at' => now()->subDay()]);
        Ad::create(['title' => 'Banner', 'placement' => 'header-banner', 'is_active' => true, 'link' => '#']);

        $all = $this->getJson('/api/ads')->assertOk()->json('data');
        $this->assertCount(2, $all);

        $sidebar = $this->getJson('/api/ads?placement=sidebar')->assertOk()->json('data');
        $this->assertCount(1, $sidebar);
        $this->assertSame('Live sidebar', $sidebar[0]['title']);
    }

    public function test_ad_impressions_and_clicks_are_counted(): void
    {
        $ad = Ad::create(['title' => 'Counted', 'placement' => 'inline', 'is_active' => true, 'link' => 'https://example.com']);

        $this->postJson("/api/ads/{$ad->id}/impression")->assertOk();
        $this->postJson("/api/ads/{$ad->id}/click")->assertOk()->assertJsonPath('link', 'https://example.com');

        $ad->refresh();
        $this->assertSame(1, $ad->impressions);
        $this->assertSame(1, $ad->clicks);
    }

    public function test_only_live_announcements_are_returned(): void
    {
        Announcement::create(['title' => 'Live', 'message' => 'Visible', 'is_active' => true]);
        Announcement::create(['title' => 'Off', 'message' => 'Hidden', 'is_active' => false]);
        Announcement::create(['title' => 'Stale', 'message' => 'Gone', 'is_active' => true, 'expires_at' => now()->subDay()]);

        $data = $this->getJson('/api/announcements')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame('Live', $data[0]['title']);
    }

    public function test_a_visitor_can_send_feedback(): void
    {
        $this->postJson('/api/feedback', [
            'type' => 'bug',
            'subject' => 'Something broke',
            'message' => 'The dark mode toggle does nothing on mobile.',
            'email' => 'visitor@example.com',
        ])->assertCreated();

        $this->assertDatabaseHas('feedback', ['email' => 'visitor@example.com', 'status' => 'open']);
    }

    public function test_feedback_validates_its_input(): void
    {
        $this->postJson('/api/feedback', ['type' => 'nonsense', 'subject' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['type', 'subject', 'message', 'email']);
    }

    public function test_tag_cloud_only_counts_published_stories(): void
    {
        $tag = Tag::fromName('climate');

        $live = $this->makePost(['title' => 'Live']);
        $draft = $this->makePost(['title' => 'Draft', 'status' => 'draft', 'published_at' => null]);
        $live->tags()->sync([$tag->id]);
        $draft->tags()->sync([$tag->id]);

        $data = $this->getJson('/api/tags')->assertOk()->json('data');

        $this->assertCount(1, $data);
        $this->assertSame(1, $data[0]['postsCount']);
    }

    public function test_post_payload_uses_the_shape_the_spa_expects(): void
    {
        $category = $this->category();
        $post = $this->makePost(['category_id' => $category->id, 'is_featured' => true]);
        $post->tags()->sync([Tag::fromName('climate')->id]);

        $data = $this->getJson('/api/posts')->assertOk()->json('data.0');

        $this->assertSame('world', $data['category']);
        $this->assertSame('World', $data['categoryName']);
        $this->assertSame('#3B82F6', $data['categoryColor']);
        $this->assertSame(['climate'], $data['tags']);
        $this->assertTrue($data['isFeatured']);
        $this->assertIsString($data['publishedAt']);
    }

    public function test_pagination_metadata_is_present(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->makePost(['title' => "Story {$i}"]);
        }

        $response = $this->getJson('/api/posts?per_page=2')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(5, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
    }
}

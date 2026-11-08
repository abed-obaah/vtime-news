<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Feedback;
use App\Models\FeedSource;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_admin_area_is_closed_to_readers_and_guests(): void
    {
        $this->getJson('/api/admin/posts')->assertStatus(401);

        $this->actingAs($this->reader(), 'sanctum')->getJson('/api/admin/posts')->assertStatus(403);

        $this->actingAs($this->admin(), 'sanctum')->getJson('/api/admin/posts')->assertOk();
    }

    public function test_an_editor_can_reach_the_admin_area(): void
    {
        $editor = $this->reader(['role' => 'editor']);

        $this->actingAs($editor, 'sanctum')->getJson('/api/admin/posts')->assertOk();
    }

    public function test_admins_see_every_status_including_the_moderation_queue(): void
    {
        $this->makePost(['title' => 'Live', 'status' => 'published']);
        $this->makePost(['title' => 'Waiting', 'status' => 'pending', 'published_at' => null]);
        $this->makePost(['title' => 'Rejected', 'status' => 'rejected', 'published_at' => null]);

        $admin = $this->admin();

        $this->assertCount(3, $this->actingAs($admin, 'sanctum')->getJson('/api/admin/posts')->json('data'));

        $pending = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/posts?status=pending')->json('data');
        $this->assertCount(1, $pending);
        $this->assertSame('Waiting', $pending[0]['title']);
    }

    public function test_post_counts_drive_the_moderation_tabs(): void
    {
        $this->makePost(['status' => 'published']);
        $this->makePost(['status' => 'pending', 'published_at' => null]);
        $this->makePost(['status' => 'pending', 'published_at' => null]);
        $this->makePost(['status' => 'draft', 'published_at' => null]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/posts/counts')
            ->assertOk()
            ->assertJsonPath('data.all', 4)
            ->assertJsonPath('data.pending', 2)
            ->assertJsonPath('data.draft', 1)
            ->assertJsonPath('data.published', 1);
    }

    public function test_an_admin_can_write_a_story_and_publish_it(): void
    {
        $category = $this->category();
        $admin = $this->admin();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/posts', [
            'title' => 'A Fresh Editorial',
            'excerpt' => 'The summary.',
            'content' => '<p>Body copy for the story.</p>',
            'category_id' => $category->id,
            'status' => 'published',
            'tags' => ['policy', 'Long Read'],
            'is_featured' => true,
        ])->assertCreated();

        $slug = $response->json('data.slug');

        $this->assertSame('a-fresh-editorial', $slug);
        $this->assertSame(['policy', 'long-read'], $response->json('data.tags'));

        // It is immediately visible to the public.
        $this->getJson("/api/posts/{$slug}")->assertOk()->assertJsonPath('data.title', 'A Fresh Editorial');
    }

    public function test_scripts_in_submitted_article_bodies_are_stripped(): void
    {
        $admin = $this->admin();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/posts', [
            'title' => 'Sanitised Story',
            'content' => '<p>Safe</p><script>alert(1)</script><img src="x" onerror="steal()">',
            'status' => 'draft',
        ])->assertCreated();

        $content = $response->json('data.content');

        $this->assertStringNotContainsString('script', $content);
        $this->assertStringNotContainsString('onerror', $content);
        $this->assertStringContainsString('Safe', $content);
    }

    public function test_creating_a_post_validates_its_input(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/posts', ['title' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'content']);
    }

    public function test_the_full_rss_moderation_workflow(): void
    {
        $admin = $this->admin();

        $post = $this->makePost([
            'title' => 'Imported From The Wire',
            'status' => 'pending',
            'source' => 'rss',
            'published_at' => null,
        ]);

        // Not visible to readers while it waits.
        $this->getJson("/api/posts/{$post->slug}")->assertStatus(404);

        // The editor proofreads and rewrites it.
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/posts/{$post->id}", [
            'title' => 'Imported From The Wire — Edited',
            'content' => '<p>Rewritten for our house style.</p>',
            'excerpt' => 'Our own summary.',
        ])->assertOk()->assertJsonPath('data.title', 'Imported From The Wire — Edited');

        // Then publishes it.
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/posts/{$post->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $post->refresh();
        $this->assertSame($admin->id, $post->reviewed_by);
        $this->assertNotNull($post->published_at);

        // Now readers can see it.
        $this->getJson("/api/posts/{$post->slug}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Imported From The Wire — Edited');
    }

    public function test_an_admin_can_reject_and_unpublish_stories(): void
    {
        $admin = $this->admin();
        $pending = $this->makePost(['status' => 'pending', 'published_at' => null]);
        $live = $this->makePost(['status' => 'published']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/posts/{$pending->id}/reject", ['note' => 'Unverified source.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertSame('Unverified source.', $pending->fresh()->review_note);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/posts/{$live->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        $this->getJson("/api/posts/{$live->slug}")->assertStatus(404);
    }

    public function test_bulk_actions_apply_to_the_whole_selection(): void
    {
        $admin = $this->admin();

        $ids = collect(range(1, 3))
            ->map(fn ($i) => $this->makePost(['title' => "Queued {$i}", 'status' => 'pending', 'published_at' => null])->id)
            ->all();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/posts/bulk', ['ids' => $ids, 'action' => 'publish'])
            ->assertOk()
            ->assertJsonPath('affected', 3);

        $this->assertSame(3, Post::where('status', 'published')->count());

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/posts/bulk', ['ids' => $ids, 'action' => 'delete'])
            ->assertOk();

        $this->assertSame(0, Post::count());
    }

    public function test_bulk_actions_validate_the_requested_action(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/posts/bulk', ['ids' => [1], 'action' => 'nuke'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('action');
    }

    public function test_an_admin_can_delete_a_story(): void
    {
        $post = $this->makePost();

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/admin/posts/{$post->id}")
            ->assertOk();

        $this->assertSoftDeleted('posts', ['id' => $post->id]);
        $this->getJson("/api/posts/{$post->slug}")->assertStatus(404);
    }

    public function test_categories_can_be_managed(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/categories', [
            'name' => 'Culture',
            'color' => '#123456',
            'description' => 'Arts and culture.',
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertSame('culture', $created->json('data.slug'));

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/categories/{$id}", ['name' => 'Arts & Culture'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Arts & Culture');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/categories/{$id}")->assertOk();
        $this->assertDatabaseCount('categories', 0);
    }

    public function test_deleting_a_category_keeps_its_stories(): void
    {
        $category = $this->category();
        $post = $this->makePost(['category_id' => $category->id]);

        $this->actingAs($this->admin(), 'sanctum')->deleteJson("/api/admin/categories/{$category->id}")->assertOk();

        $this->assertNull($post->fresh()->category_id);
        $this->assertNotNull($post->fresh());
    }

    public function test_category_colour_is_validated(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Bad', 'color' => 'blue'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('color');
    }

    public function test_users_can_be_searched_promoted_and_banned(): void
    {
        $admin = $this->admin();
        $reader = $this->reader(['name' => 'Findable Reader', 'email' => 'findable@example.com']);

        $found = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users?q=findable')->assertOk()->json('data');
        $this->assertCount(1, $found);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$reader->id}", ['role' => 'editor'])
            ->assertOk()
            ->assertJsonPath('data.role', 'editor');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$reader->id}", ['status' => 'banned'])
            ->assertOk()
            ->assertJsonPath('data.status', 'banned');
    }

    public function test_the_last_admin_cannot_be_demoted_banned_or_deleted(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$admin->id}", ['role' => 'user'])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$admin->id}", ['status' => 'banned'])
            ->assertStatus(422);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422);

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_a_second_admin_can_be_demoted(): void
    {
        $first = $this->admin();
        $second = $this->admin();

        $this->actingAs($first, 'sanctum')
            ->putJson("/api/admin/users/{$second->id}", ['role' => 'user'])
            ->assertOk();

        $this->assertSame('user', $second->fresh()->role);
    }

    public function test_comments_can_be_moderated(): void
    {
        $admin = $this->admin();
        $post = $this->makePost();
        $comment = Comment::create([
            'post_id' => $post->id, 'user_id' => $this->reader()->id, 'content' => 'Questionable', 'status' => 'approved',
        ]);
        $post->forceFill(['comments_count' => 1])->saveQuietly();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/comments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.postTitle', $post->title);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/comments/{$comment->id}", ['status' => 'rejected'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        // Rejecting it drops it from the public thread and the story's counter.
        $this->assertSame(0, $post->fresh()->comments_count);
        $this->assertCount(0, $this->getJson("/api/posts/{$post->slug}/comments")->json('data'));

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/comments/{$comment->id}")->assertOk();
        $this->assertDatabaseCount('comments', 0);
    }

    public function test_comment_counts_endpoint_reports_each_status(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        Comment::create(['post_id' => $post->id, 'user_id' => $user->id, 'content' => 'One', 'status' => 'approved']);
        Comment::create(['post_id' => $post->id, 'user_id' => $user->id, 'content' => 'Two', 'status' => 'flagged']);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/comments/counts')
            ->assertOk()
            ->assertJsonPath('data.all', 2)
            ->assertJsonPath('data.approved', 1)
            ->assertJsonPath('data.flagged', 1);
    }

    public function test_ads_can_be_managed_and_toggled(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/ads', [
            'title' => 'House Ad',
            'description' => 'Subscribe today.',
            'placement' => 'sidebar',
            'link' => 'https://example.com',
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertTrue($created->json('data.active'));

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/ads/{$id}/toggle")
            ->assertOk()->assertJsonPath('data.active', false);

        $this->assertCount(0, $this->getJson('/api/ads')->json('data'));

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/ads/{$id}", ['title' => 'Renamed Ad'])
            ->assertOk()->assertJsonPath('data.title', 'Renamed Ad');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/ads/{$id}")->assertOk();
        $this->assertDatabaseCount('ads', 0);
    }

    public function test_an_invalid_ad_placement_is_rejected(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/ads', ['title' => 'Nope', 'placement' => 'the-moon'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('placement');
    }

    public function test_announcements_can_be_managed_and_toggled(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/announcements', [
            'title' => 'Maintenance tonight',
            'message' => 'We will be down for 20 minutes.',
            'type' => 'warning',
        ])->assertCreated();

        $id = $created->json('data.id');

        $this->assertCount(1, $this->getJson('/api/announcements')->json('data'));

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/announcements/{$id}/toggle")
            ->assertOk()->assertJsonPath('data.active', false);

        $this->assertCount(0, $this->getJson('/api/announcements')->json('data'));

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/announcements/{$id}")->assertOk();
        $this->assertDatabaseCount('announcements', 0);
    }

    public function test_feedback_can_be_answered_and_resolved(): void
    {
        $admin = $this->admin();

        $this->postJson('/api/feedback', [
            'type' => 'bug',
            'subject' => 'Broken link',
            'message' => 'The footer privacy link 404s.',
            'email' => 'reporter@example.com',
        ])->assertCreated();

        $id = Feedback::first()->id;

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/feedback')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/feedback/{$id}/reply", ['reply' => 'Fixed, thanks for the report.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/feedback/{$id}")->assertOk();
        $this->assertDatabaseCount('feedback', 0);
    }

    public function test_the_overview_dashboard_reports_real_numbers(): void
    {
        $admin = $this->admin();
        $this->reader();

        $this->makePost(['status' => 'published']);
        $this->makePost(['status' => 'pending', 'published_at' => null]);

        FeedSource::create(['name' => 'A feed', 'url' => 'https://example.com/rss', 'is_active' => true]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/stats/overview')->assertOk();

        $this->assertSame(2, $response->json('data.stats.posts.value'));
        $this->assertSame(2, $response->json('data.stats.users.value'));
        $this->assertSame(1, $response->json('data.queue.pendingPosts'));
        $this->assertSame(1, $response->json('data.queue.activeFeeds'));
        $this->assertCount(7, $response->json('data.weeklyTraffic'));
    }

    public function test_the_analytics_screen_reports_totals_and_a_daily_series(): void
    {
        $admin = $this->admin();
        $category = $this->category();
        $post = $this->makePost(['category_id' => $category->id]);

        $this->getJson("/api/posts/{$post->slug}");

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats/analytics?days=14')
            ->assertOk();

        $this->assertSame(1, $response->json('data.totals.views'));
        $this->assertCount(14, $response->json('data.daily'));
        $this->assertSame('world', $response->json('data.categories.0.slug'));
    }
}

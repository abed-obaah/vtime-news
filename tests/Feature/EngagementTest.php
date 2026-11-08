<?php

namespace Tests\Feature;

use App\Models\Comment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EngagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_reader_can_like_and_unlike_a_story(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/like")
            ->assertOk()
            ->assertJsonPath('liked', true)
            ->assertJsonPath('likes', 1);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/like")
            ->assertOk()
            ->assertJsonPath('liked', false)
            ->assertJsonPath('likes', 0);

        $this->assertDatabaseCount('post_likes', 0);
    }

    public function test_liking_requires_a_signed_in_reader(): void
    {
        $post = $this->makePost();

        $this->postJson("/api/posts/{$post->slug}/like")->assertStatus(401);
    }

    public function test_a_reader_can_save_and_unsave_a_story(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/bookmark")
            ->assertOk()->assertJsonPath('saved', true);

        $this->actingAs($user, 'sanctum')->getJson('/api/me/bookmarks')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/bookmark")
            ->assertOk()->assertJsonPath('saved', false);

        $this->actingAs($user, 'sanctum')->getJson('/api/me/bookmarks')
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_liked_stories_show_up_in_the_readers_dashboard(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/like");

        $this->actingAs($user, 'sanctum')->getJson('/api/me/likes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', $post->slug);
    }

    public function test_a_reader_can_rate_a_story_once_and_change_their_mind(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/rate", ['value' => 5])
            ->assertOk()
            ->assertJsonPath('rating', 5)
            ->assertJsonPath('ratingCount', 1);

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/rate", ['value' => 3])
            ->assertOk()
            ->assertJsonPath('rating', 3)
            ->assertJsonPath('ratingCount', 1);

        $this->assertDatabaseCount('ratings', 1);
    }

    public function test_ratings_are_averaged_across_readers(): void
    {
        $post = $this->makePost();

        $this->actingAs($this->reader(), 'sanctum')->postJson("/api/posts/{$post->slug}/rate", ['value' => 5]);
        $this->actingAs($this->reader(), 'sanctum')->postJson("/api/posts/{$post->slug}/rate", ['value' => 4]);

        $this->assertSame(4.5, $post->fresh()->rating);
    }

    public function test_a_rating_must_be_between_one_and_five(): void
    {
        $post = $this->makePost();

        $this->actingAs($this->reader(), 'sanctum')
            ->postJson("/api/posts/{$post->slug}/rate", ['value' => 9])
            ->assertStatus(422)
            ->assertJsonValidationErrors('value');
    }

    public function test_the_viewer_block_reflects_the_readers_own_state(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/like");
        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/bookmark");
        $this->actingAs($user, 'sanctum')->postJson("/api/posts/{$post->slug}/rate", ['value' => 4]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/posts/{$post->slug}")
            ->assertOk()
            ->assertJsonPath('data.viewer.liked', true)
            ->assertJsonPath('data.viewer.saved', true)
            ->assertJsonPath('data.viewer.rating', 4);
    }

    public function test_a_reader_can_post_a_comment(): void
    {
        $post = $this->makePost();
        $user = $this->reader(['name' => 'Commenter']);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'A thoughtful take on the story.'])
            ->assertCreated()
            ->assertJsonPath('data.userName', 'Commenter')
            ->assertJsonPath('data.status', 'approved');

        $this->assertSame(1, $post->fresh()->comments_count);
    }

    public function test_comment_html_is_stripped(): void
    {
        $post = $this->makePost();

        $response = $this->actingAs($this->reader(), 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'Nice <script>alert(1)</script> story'])
            ->assertCreated();

        $this->assertStringNotContainsString('<script>', $response->json('data.content'));
    }

    public function test_a_reader_can_reply_to_a_comment(): void
    {
        $post = $this->makePost();
        $user = $this->reader();

        $parent = Comment::create(['post_id' => $post->id, 'user_id' => $user->id, 'content' => 'Parent', 'status' => 'approved']);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'My reply', 'parent_id' => $parent->id])
            ->assertCreated()
            ->assertJsonPath('data.parentId', (string) $parent->id);
    }

    public function test_replying_to_a_comment_from_another_story_is_rejected(): void
    {
        $post = $this->makePost();
        $other = $this->makePost(['title' => 'Elsewhere']);
        $user = $this->reader();

        $foreign = Comment::create(['post_id' => $other->id, 'user_id' => $user->id, 'content' => 'Elsewhere', 'status' => 'approved']);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'Reply', 'parent_id' => $foreign->id])
            ->assertStatus(422);
    }

    public function test_comment_content_is_validated(): void
    {
        $post = $this->makePost();

        $this->actingAs($this->reader(), 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    public function test_a_reader_can_like_a_comment_once(): void
    {
        $post = $this->makePost();
        $user = $this->reader();
        $comment = Comment::create(['post_id' => $post->id, 'user_id' => $user->id, 'content' => 'Hi', 'status' => 'approved']);

        $this->actingAs($user, 'sanctum')->postJson("/api/comments/{$comment->id}/like")
            ->assertOk()->assertJsonPath('liked', true)->assertJsonPath('likes', 1);

        $this->actingAs($user, 'sanctum')->postJson("/api/comments/{$comment->id}/like")
            ->assertOk()->assertJsonPath('liked', false)->assertJsonPath('likes', 0);
    }

    public function test_reporting_a_comment_three_times_flags_it(): void
    {
        $post = $this->makePost();
        $comment = Comment::create(['post_id' => $post->id, 'user_id' => $this->reader()->id, 'content' => 'Spam', 'status' => 'approved']);

        foreach (range(1, 3) as $ignored) {
            $this->actingAs($this->reader(), 'sanctum')->postJson("/api/comments/{$comment->id}/report")->assertOk();
        }

        $this->assertSame('flagged', $comment->fresh()->status);
    }

    public function test_a_reader_can_delete_their_own_comment_but_not_someone_elses(): void
    {
        $post = $this->makePost();
        $owner = $this->reader();
        $other = $this->reader();

        $comment = Comment::create(['post_id' => $post->id, 'user_id' => $owner->id, 'content' => 'Mine', 'status' => 'approved']);
        $post->forceFill(['comments_count' => 1])->saveQuietly();

        $this->actingAs($other, 'sanctum')->deleteJson("/api/comments/{$comment->id}")->assertStatus(403);

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/comments/{$comment->id}")->assertOk();

        $this->assertDatabaseCount('comments', 0);
        $this->assertSame(0, $post->fresh()->comments_count);
    }

    public function test_a_banned_reader_cannot_interact(): void
    {
        $post = $this->makePost();
        $banned = $this->reader(['status' => 'banned']);

        $this->actingAs($banned, 'sanctum')->postJson("/api/posts/{$post->slug}/like")->assertStatus(403);
        $this->actingAs($banned, 'sanctum')->postJson("/api/posts/{$post->slug}/comments", ['content' => 'Hello there'])->assertStatus(403);
    }
}

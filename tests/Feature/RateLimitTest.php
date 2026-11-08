<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:');
        app('cache')->flush();
    }

    private function attemptLogin(string $email, string $password = 'wrong-password'): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/auth/login', ['email' => $email, 'password' => $password]);
    }

    public function test_repeated_failures_against_one_account_are_throttled(): void
    {
        $this->reader(['email' => 'target@example.com', 'password' => 'correct-password']);

        for ($i = 0; $i < 5; $i++) {
            $this->attemptLogin('target@example.com')->assertStatus(422);
        }

        $this->attemptLogin('target@example.com')->assertStatus(429);
    }

    public function test_one_account_being_throttled_does_not_lock_out_another_on_the_same_ip(): void
    {
        $this->reader(['email' => 'noisy@example.com', 'password' => 'correct-password']);
        $this->reader(['email' => 'innocent@example.com', 'password' => 'their-password']);

        // Someone hammers one account from this address...
        for ($i = 0; $i < 6; $i++) {
            $this->attemptLogin('noisy@example.com');
        }

        $this->attemptLogin('noisy@example.com')->assertStatus(429);

        // ...a colleague behind the same NAT can still sign in.
        $this->postJson('/api/auth/login', [
            'email' => 'innocent@example.com',
            'password' => 'their-password',
        ])->assertOk();
    }

    public function test_spraying_many_accounts_from_one_ip_is_still_capped(): void
    {
        $blocked = false;

        for ($i = 0; $i < 40; $i++) {
            $status = $this->attemptLogin("victim{$i}@example.com")->getStatusCode();

            if ($status === 429) {
                $blocked = true;
                break;
            }
        }

        $this->assertTrue($blocked, 'A single IP spraying many accounts must eventually be blocked.');
    }

    public function test_password_reset_requests_are_throttled_per_account(): void
    {
        $this->reader(['email' => 'resetspam@example.com']);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/auth/forgot-password', ['email' => 'resetspam@example.com'])->assertOk();
        }

        $this->postJson('/api/auth/forgot-password', ['email' => 'resetspam@example.com'])->assertStatus(429);

        // A different address is unaffected.
        $this->postJson('/api/auth/forgot-password', ['email' => 'someone-else@example.com'])->assertOk();
    }

    public function test_comment_throttling_is_per_account_not_per_ip(): void
    {
        $post = $this->makePost();
        $chatty = $this->reader();
        $quiet = $this->reader();

        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($chatty, 'sanctum')
                ->postJson("/api/posts/{$post->slug}/comments", ['content' => "Comment number {$i}"]);
        }

        $this->actingAs($chatty, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'One too many'])
            ->assertStatus(429);

        // Another reader on the same connection is not caught by it.
        $this->actingAs($quiet, 'sanctum')
            ->postJson("/api/posts/{$post->slug}/comments", ['content' => 'My first comment here'])
            ->assertCreated();
    }
}

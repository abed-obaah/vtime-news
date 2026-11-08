<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_visitor_can_register_and_receives_a_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Reader',
            'email' => 'New.Reader@Example.com',
            'password' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.email', 'new.reader@example.com')
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'role'], 'token']);

        $this->assertDatabaseHas('users', ['email' => 'new.reader@example.com']);
    }

    public function test_registration_rejects_a_duplicate_email(): void
    {
        $this->reader(['email' => 'taken@example.com']);

        $this->postJson('/api/auth/register', [
            'name' => 'Someone',
            'email' => 'taken@example.com',
            'password' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_a_reader_can_log_in(): void
    {
        $this->reader(['email' => 'reader@example.com', 'password' => 'secret123']);

        $this->postJson('/api/auth/login', [
            'email' => 'reader@example.com',
            'password' => 'secret123',
        ])->assertOk()->assertJsonStructure(['user', 'token']);
    }

    public function test_bad_credentials_are_rejected(): void
    {
        $this->reader(['email' => 'reader@example.com', 'password' => 'secret123']);

        $this->postJson('/api/auth/login', [
            'email' => 'reader@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_a_banned_account_cannot_log_in(): void
    {
        $this->reader(['email' => 'banned@example.com', 'password' => 'secret123', 'status' => 'banned']);

        $this->postJson('/api/auth/login', [
            'email' => 'banned@example.com',
            'password' => 'secret123',
        ])->assertStatus(422);
    }

    public function test_me_returns_the_signed_in_user(): void
    {
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_a_reader_can_update_their_profile(): void
    {
        $user = $this->reader();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/profile', ['name' => 'Renamed Reader', 'bio' => 'Hello.'])
            ->assertOk()
            ->assertJsonPath('user.name', 'Renamed Reader');

        $this->assertSame('Hello.', $user->fresh()->bio);
    }

    public function test_changing_a_password_requires_the_current_one(): void
    {
        $user = $this->reader(['password' => 'secret123']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/profile', ['password' => 'brand-new', 'current_password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/profile', ['password' => 'brand-new', 'current_password' => 'secret123'])
            ->assertOk();
    }

    public function test_a_banned_reader_is_blocked_from_authenticated_routes(): void
    {
        $user = $this->reader(['status' => 'banned']);

        $this->actingAs($user, 'sanctum')->getJson('/api/auth/me')->assertStatus(403);
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = $this->reader(['email' => 'logout@example.com', 'password' => 'secret123']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertSame(0, User::find($user->id)->tokens()->count());
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_reader_can_request_a_reset_link(): void
    {
        Notification::fake();

        $user = $this->reader(['email' => 'forgetful@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'forgetful@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'If that email is registered, a reset link is on its way.');

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_the_email_is_matched_case_insensitively(): void
    {
        Notification::fake();

        $user = $this->reader(['email' => 'mixed@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'MIXED@Example.COM'])->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_an_unknown_address_gets_the_same_answer_and_no_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'If that email is registered, a reset link is on its way.');

        Notification::assertNothingSent();
    }

    public function test_a_suspended_account_cannot_request_a_reset(): void
    {
        Notification::fake();

        $this->reader(['email' => 'banned@example.com', 'status' => 'banned']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'banned@example.com'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_the_reset_link_points_at_the_spa_route(): void
    {
        Notification::fake();

        $user = $this->reader(['email' => 'linked@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'linked@example.com']);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use ($user) {
            $mail = $notification->toMail($user);
            $url = collect($mail->actionUrl)->first() ?? $mail->actionUrl;

            return str_contains($url, '/reset-password?token=')
                && str_contains($url, 'email=linked%40example.com');
        });
    }

    public function test_a_valid_token_changes_the_password(): void
    {
        $user = $this->reader(['email' => 'resetme@example.com', 'password' => 'old-password']);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'resetme@example.com',
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-password', $user->fresh()->password));

        // And the new password actually signs them in.
        $this->postJson('/api/auth/login', [
            'email' => 'resetme@example.com',
            'password' => 'brand-new-password',
        ])->assertOk();
    }

    public function test_resetting_revokes_existing_sessions(): void
    {
        $user = $this->reader(['email' => 'sessions@example.com']);
        $user->createToken('old-device');
        $this->assertSame(1, $user->tokens()->count());

        $this->postJson('/api/auth/reset-password', [
            'token' => Password::createToken($user),
            'email' => 'sessions@example.com',
            'password' => 'a-fresh-password',
            'password_confirmation' => 'a-fresh-password',
        ])->assertOk();

        $this->assertSame(0, User::find($user->id)->tokens()->count());
    }

    public function test_a_token_cannot_be_used_twice(): void
    {
        $user = $this->reader(['email' => 'once@example.com']);
        $token = Password::createToken($user);

        $payload = [
            'token' => $token,
            'email' => 'once@example.com',
            'password' => 'first-new-password',
            'password_confirmation' => 'first-new-password',
        ];

        $this->postJson('/api/auth/reset-password', $payload)->assertOk();
        $this->postJson('/api/auth/reset-password', $payload)->assertStatus(422);
    }

    public function test_a_forged_token_is_rejected(): void
    {
        $this->reader(['email' => 'forged@example.com']);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'not-a-real-token',
            'email' => 'forged@example.com',
            'password' => 'does-not-matter',
            'password_confirmation' => 'does-not-matter',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_the_new_password_is_validated(): void
    {
        $user = $this->reader(['email' => 'weak@example.com']);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'weak@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'weak@example.com',
            'password' => 'long-enough-password',
            'password_confirmation' => 'different-password',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_requesting_a_link_validates_the_address(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }
}

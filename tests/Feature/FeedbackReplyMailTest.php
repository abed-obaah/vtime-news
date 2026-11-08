<?php

namespace Tests\Feature;

use App\Mail\FeedbackReplyMail;
use App\Models\Feedback;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class FeedbackReplyMailTest extends TestCase
{
    use RefreshDatabase;

    private function feedback(array $attributes = []): Feedback
    {
        return Feedback::create(array_merge([
            'name' => 'Sam Reader',
            'email' => 'sam@example.com',
            'type' => 'bug',
            'subject' => 'Dark mode breaks on mobile',
            'message' => 'The toggle does nothing on my phone.',
            'status' => 'open',
        ], $attributes));
    }

    public function test_replying_emails_the_reader(): void
    {
        Mail::fake();

        $feedback = $this->feedback();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", [
                'reply' => 'Thanks — fixed in this morning\'s release.',
            ])
            ->assertOk()
            ->assertJsonPath('emailed', true)
            ->assertJsonPath('data.status', 'resolved');

        Mail::assertSent(FeedbackReplyMail::class, function (FeedbackReplyMail $mail) use ($feedback) {
            return $mail->hasTo($feedback->email)
                && str_contains($mail->reply, 'fixed in this morning');
        });

        $this->assertNotNull($feedback->fresh()->reply_emailed_at);
    }

    public function test_the_email_carries_the_original_subject_and_message(): void
    {
        Mail::fake();

        $feedback = $this->feedback();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => 'Looking into it.'])
            ->assertOk();

        Mail::assertSent(FeedbackReplyMail::class, function (FeedbackReplyMail $mail) {
            $rendered = $mail->render();

            return str_contains($mail->envelope()->subject, 'Dark mode breaks on mobile')
                && str_contains($rendered, 'Looking into it.')
                && str_contains($rendered, 'The toggle does nothing on my phone.')
                && str_contains($rendered, 'Sam Reader');
        });
    }

    public function test_a_mail_failure_still_saves_the_reply(): void
    {
        // Any send throws — the newsroom must not lose what it wrote.
        Mail::shouldReceive('to->send')->andThrow(new \RuntimeException('SMTP refused the connection'));

        $feedback = $this->feedback();

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => 'Saved even though mail broke.'])
            ->assertOk()
            ->assertJsonPath('emailed', false);

        $this->assertStringContainsString('could not be sent', $response->json('message'));
        $this->assertSame('Saved even though mail broke.', $feedback->fresh()->admin_reply);
        $this->assertNull($feedback->fresh()->reply_emailed_at);
    }

    public function test_an_unparseable_address_is_reported_rather_than_attempted(): void
    {
        Mail::fake();

        $feedback = $this->feedback(['email' => 'not-an-address']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => 'Hello?'])
            ->assertOk()
            ->assertJsonPath('emailed', false);

        Mail::assertNothingSent();
        $this->assertSame('Hello?', $feedback->fresh()->admin_reply);
    }

    public function test_replying_without_resolving_keeps_the_item_open(): void
    {
        Mail::fake();

        $feedback = $this->feedback();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", [
                'reply' => 'Still digging into this.',
                'resolve' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'open');

        Mail::assertSent(FeedbackReplyMail::class);
    }

    public function test_only_staff_can_reply(): void
    {
        Mail::fake();

        $feedback = $this->feedback();

        $this->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => 'Hi'])->assertStatus(401);

        $this->actingAs($this->reader(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => 'Hi'])
            ->assertStatus(403);

        Mail::assertNothingSent();
    }

    public function test_the_reply_body_is_validated(): void
    {
        Mail::fake();

        $feedback = $this->feedback();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reply');

        Mail::assertNothingSent();
    }
}

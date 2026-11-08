<?php

namespace App\Mail;

use App\Models\Feedback;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** The newsroom's answer to something a reader sent in. */
class FeedbackReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Feedback $feedback,
        public string $reply,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Re: '.$this->feedback->subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.feedback-reply',
            with: [
                'name' => $this->feedback->name ?: 'there',
                'subject' => $this->feedback->subject,
                'original' => $this->feedback->message,
                'reply' => $this->reply,
                'siteUrl' => rtrim(config('pulsenews.site_url'), '/'),
            ],
        );
    }
}

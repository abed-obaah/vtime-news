<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeedbackResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => $this->type,
            'subject' => $this->subject,
            'message' => $this->message,
            'name' => $this->name,
            'user' => $this->email,
            'status' => $this->status,
            'adminReply' => $this->admin_reply,
            'repliedAt' => optional($this->replied_at)->toIso8601String(),
            'replyEmailedAt' => optional($this->reply_emailed_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}

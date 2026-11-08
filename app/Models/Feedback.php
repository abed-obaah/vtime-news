<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    use HasFactory;

    protected $table = 'feedback';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'type',
        'subject',
        'message',
        'status',
        'admin_reply',
        'replied_at',
        'reply_emailed_at',
    ];

    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
            'reply_emailed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

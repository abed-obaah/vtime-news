<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LiveStream extends Model
{
    use HasFactory;

    public const STATUSES = ['live', 'ended'];

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'description',
        'room_name',
        'status',
        'started_at',
        'ended_at',
        'ended_by',
        'end_reason',
        'peak_viewers',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'peak_viewers' => 'integer',
        ];
    }

    /** A short, unguessable room identifier that also works as the public URL segment. */
    public static function newRoomName(): string
    {
        do {
            $name = 'ln-'.Str::lower(Str::random(10));
        } while (static::where('room_name', $name)->exists());

        return $name;
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function endedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ended_by');
    }

    public function isLive(): bool
    {
        return $this->status === 'live';
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', 'live');
    }
}

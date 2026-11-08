<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedSource extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'url_hash',
        'website',
        'category_id',
        'is_active',
        'auto_publish',
        'fetch_interval_minutes',
        'last_fetched_at',
        'last_status',
        'last_error',
        'items_imported',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'auto_publish' => 'boolean',
            'last_fetched_at' => 'datetime',
            'fetch_interval_minutes' => 'integer',
            'items_imported' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (FeedSource $source) {
            $source->url_hash = hash('sha256', rtrim(trim($source->url), '/'));
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function isDue(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        return $this->last_fetched_at === null
            || $this->last_fetched_at->addMinutes(max(5, $this->fetch_interval_minutes))->isPast();
    }
}

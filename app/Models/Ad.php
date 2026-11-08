<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ad extends Model
{
    use HasFactory;

    public const PLACEMENTS = ['sidebar', 'header-banner', 'inline', 'before-footer', 'popup', 'popunder'];

    // 'custom' = our own title/description/image/link card.
    // 'network' = a code snippet from an outside promoter (Google AdSense, Media.net, …).
    public const SOURCES = ['custom', 'network'];

    protected $fillable = [
        'title',
        'description',
        'image',
        'link',
        'placement',
        'source',
        'network_name',
        'code',
        'is_active',
        'priority',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'priority' => 'integer',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', now()));
    }
}

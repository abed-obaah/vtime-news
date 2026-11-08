<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Tag extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug'];

    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_tag');
    }

    /**
     * Find (or create) a tag from free-form text such as "Machine Learning".
     */
    public static function fromName(string $name): ?self
    {
        $name = trim($name);
        $slug = Str::slug($name);

        if ($slug === '' || mb_strlen($name) > 60) {
            return null;
        }

        return static::firstOrCreate(['slug' => $slug], ['name' => $name]);
    }
}

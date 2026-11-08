<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Wire feeds keep filling the moderation queue on their own; each source
// decides how often it actually goes out via fetch_interval_minutes.
Schedule::command('rss:fetch')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

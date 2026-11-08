<?php

return [

    'rss' => [
        // Max items pulled from a single feed per run.
        'limit' => (int) env('RSS_FETCH_LIMIT', 25),

        // HTTP timeout, in seconds, per feed request.
        'timeout' => (int) env('RSS_TIMEOUT', 20),
    ],

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    // Public origin used in canonical URLs, sitemaps, feeds and OG tags.
    'site_url' => rtrim(env('SITE_URL') ?: env('APP_URL') ?: 'http://localhost:8000', '/'),

    // Where `npm run build` puts the SPA. Laravel serves it from here so that
    // crawlers get server-rendered <head> metadata.
    // `?:` not a default arg — an empty env value must fall through too.
    'spa_path' => env('PULSENEWS_SPA_PATH') ?: dirname(base_path()).'/dist',

];

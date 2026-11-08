<?php

use App\Http\Controllers\SeoController;
use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Crawler-facing endpoints
|--------------------------------------------------------------------------
| Plain XML/text — no JavaScript required, so every search engine and
| aggregator can read them.
*/
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);
Route::get('/news-sitemap.xml', [SeoController::class, 'newsSitemap']);
Route::get('/feed.xml', [SeoController::class, 'feed']);
Route::get('/feed/{category}.xml', [SeoController::class, 'feed']);

/*
|--------------------------------------------------------------------------
| The single-page app
|--------------------------------------------------------------------------
| Catch-all last: serves the Vite build with per-URL meta tags injected, so
| social scrapers (which don't run JS) get real previews.
*/
Route::get('/{path?}', SpaController::class)
    ->where('path', '^(?!api/|up$).*$');

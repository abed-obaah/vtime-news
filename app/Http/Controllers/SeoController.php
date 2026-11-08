<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * Crawler-facing endpoints. None of these need JavaScript, so they work for
 * every search engine and aggregator regardless of rendering support.
 */
class SeoController extends Controller
{
    private function siteUrl(): string
    {
        return rtrim(config('pulsenews.site_url'), '/');
    }

    /** Standard sitemap: every published story, section and tag. */
    public function sitemap(): Response
    {
        $xml = Cache::remember('seo.sitemap', now()->addMinutes(30), function () {
            $site = $this->siteUrl();
            $urls = [];

            $urls[] = ['loc' => $site.'/', 'changefreq' => 'hourly', 'priority' => '1.0'];
            $urls[] = ['loc' => $site.'/contact', 'changefreq' => 'yearly', 'priority' => '0.3'];

            // Static site pages — see src/content/policies.js on the front end.
            foreach (['about', 'ethics', 'privacy', 'terms', 'cookies', 'accessibility'] as $page) {
                $urls[] = ['loc' => $site.'/'.$page, 'changefreq' => 'yearly', 'priority' => '0.3'];
            }

            Category::where('is_active', true)->orderBy('name')->get()
                ->each(function (Category $category) use (&$urls, $site) {
                    $urls[] = [
                        'loc' => $site.'/category/'.$category->slug,
                        'changefreq' => 'hourly',
                        'priority' => '0.8',
                    ];
                });

            Post::published()
                ->orderByDesc('published_at')
                ->limit(20000)
                ->get(['slug', 'published_at', 'updated_at'])
                ->each(function (Post $post) use (&$urls, $site) {
                    $urls[] = [
                        'loc' => $site.'/article/'.$post->slug,
                        'lastmod' => optional($post->updated_at ?? $post->published_at)->toAtomString(),
                        'changefreq' => 'weekly',
                        'priority' => '0.7',
                    ];
                });

            Tag::query()
                ->whereHas('posts', fn ($q) => $q->published())
                ->orderBy('slug')
                ->limit(2000)
                ->get(['slug'])
                ->each(function (Tag $tag) use (&$urls, $site) {
                    $urls[] = [
                        'loc' => $site.'/tag/'.$tag->slug,
                        'changefreq' => 'weekly',
                        'priority' => '0.4',
                    ];
                });

            return $this->renderUrlset($urls);
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /**
     * Google News sitemap — only stories from the last 48 hours, which is what
     * the spec allows.
     */
    public function newsSitemap(): Response
    {
        $xml = Cache::remember('seo.news-sitemap', now()->addMinutes(5), function () {
            $site = $this->siteUrl();

            $posts = Post::published()
                ->with('category')
                ->where('published_at', '>=', now()->subHours(48))
                ->orderByDesc('published_at')
                ->limit(1000)
                ->get();

            $body = '';

            foreach ($posts as $post) {
                $body .= '  <url>'."\n";
                $body .= '    <loc>'.e($site.'/article/'.$post->slug).'</loc>'."\n";
                $body .= '    <news:news>'."\n";
                $body .= '      <news:publication>'."\n";
                $body .= '        <news:name>'.e(config('app.name')).'</news:name>'."\n";
                $body .= '        <news:language>en</news:language>'."\n";
                $body .= '      </news:publication>'."\n";
                $body .= '      <news:publication_date>'.optional($post->published_at)->toAtomString().'</news:publication_date>'."\n";
                $body .= '      <news:title>'.e($post->title).'</news:title>'."\n";
                $body .= '    </news:news>'."\n";

                if ($post->image) {
                    $body .= '    <image:image><image:loc>'.e($post->image).'</image:loc></image:image>'."\n";
                }

                $body .= '  </url>'."\n";
            }

            return '<?xml version="1.0" encoding="UTF-8"?>'."\n"
                .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                .'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" '
                .'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'."\n"
                .$body
                .'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function robots(): Response
    {
        $site = $this->siteUrl();

        $body = implode("\n", [
            'User-agent: *',
            'Allow: /',
            'Disallow: /onlyadmindashboard',
            'Disallow: /dashboard',
            'Disallow: /login',
            'Disallow: /register',
            'Disallow: /search',
            'Disallow: /api/',
            '',
            'Sitemap: '.$site.'/sitemap.xml',
            'Sitemap: '.$site.'/news-sitemap.xml',
            '',
        ]);

        return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /**
     * Our own RSS 2.0 output feed, so other aggregators can subscribe to us the
     * way we subscribe to them.
     */
    public function feed(Request $request, ?string $category = null): Response
    {
        $key = 'seo.feed.'.($category ?: 'all');

        $xml = Cache::remember($key, now()->addMinutes(10), function () use ($category) {
            $site = $this->siteUrl();

            $section = $category ? Category::where('slug', $category)->first() : null;

            if ($category && ! $section) {
                return null;
            }

            $posts = Post::published()
                ->with('category')
                ->when($section, fn ($q) => $q->where('category_id', $section->id))
                ->orderByDesc('published_at')
                ->limit(50)
                ->get();

            $title = config('app.name').($section ? ' — '.$section->name : ' — Latest News');
            $selfUrl = $site.'/feed'.($section ? '/'.$section->slug : '').'.xml';

            $body = '';

            foreach ($posts as $post) {
                $link = $site.'/article/'.$post->slug;

                $body .= '    <item>'."\n";
                $body .= '      <title>'.e($post->title).'</title>'."\n";
                $body .= '      <link>'.e($link).'</link>'."\n";
                $body .= '      <guid isPermaLink="true">'.e($link).'</guid>'."\n";
                $body .= '      <description>'.e((string) $post->excerpt).'</description>'."\n";
                $body .= '      <pubDate>'.optional($post->published_at)->toRfc2822String().'</pubDate>'."\n";
                $body .= '      <dc:creator>'.e((string) $post->author).'</dc:creator>'."\n";

                if ($post->category) {
                    $body .= '      <category>'.e($post->category->name).'</category>'."\n";
                }

                if ($post->image) {
                    $body .= '      <enclosure url="'.e($post->image).'" type="image/jpeg" />'."\n";
                }

                $body .= '    </item>'."\n";
            }

            return '<?xml version="1.0" encoding="UTF-8"?>'."\n"
                .'<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">'."\n"
                .'  <channel>'."\n"
                .'    <title>'.e($title).'</title>'."\n"
                .'    <link>'.e($site).'</link>'."\n"
                .'    <atom:link href="'.e($selfUrl).'" rel="self" type="application/rss+xml" />'."\n"
                .'    <description>'.e('Breaking news and analysis from '.config('app.name')).'</description>'."\n"
                .'    <language>en</language>'."\n"
                .'    <lastBuildDate>'.now()->toRfc2822String().'</lastBuildDate>'."\n"
                .$body
                .'  </channel>'."\n"
                .'</rss>';
        });

        if ($xml === null) {
            Cache::forget($key);
            abort(404, 'No such section.');
        }

        return response($xml, 200, ['Content-Type' => 'application/rss+xml; charset=UTF-8']);
    }

    /**
     * @param  array<int, array<string, string|null>>  $urls
     */
    private function renderUrlset(array $urls): string
    {
        $body = '';

        foreach ($urls as $url) {
            $body .= '  <url>'."\n";
            $body .= '    <loc>'.e($url['loc']).'</loc>'."\n";

            if (! empty($url['lastmod'])) {
                $body .= '    <lastmod>'.$url['lastmod'].'</lastmod>'."\n";
            }

            $body .= '    <changefreq>'.$url['changefreq'].'</changefreq>'."\n";
            $body .= '    <priority>'.$url['priority'].'</priority>'."\n";
            $body .= '  </url>'."\n";
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$body
            .'</urlset>';
    }
}

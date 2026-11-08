<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Post;
use App\Services\HtmlSanitizer;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the built single-page app, with per-URL metadata written into the
 * HTML before it goes out.
 *
 * This exists because social scrapers (Facebook, X, LinkedIn, WhatsApp, Slack)
 * do not execute JavaScript — a React-managed <head> is invisible to them. When
 * Laravel serves the SPA shell, every crawler gets the right title, description,
 * canonical, Open Graph image and NewsArticle JSON-LD in the raw HTML.
 *
 * Point PULSENEWS_SPA_PATH at the Vite build output (default ../dist).
 */
class SpaController extends Controller
{
    /** Shared with src/lib/seo.js so the client can clear what we inject. */
    private const MANAGED_ATTR = 'data-pulsenews-seo';

    public function __invoke(Request $request, string $path = ''): Response|BinaryFileResponse
    {
        $root = rtrim(config('pulsenews.spa_path'), '/');
        $index = $root.'/index.html';

        if (! is_file($index)) {
            return response(
                "The front-end build was not found at {$root}.\n".
                "Run `npm run build` in the project root, or set PULSENEWS_SPA_PATH in backend/.env.\n",
                503
            )->header('Content-Type', 'text/plain');
        }

        // Static assets (JS, CSS, images) are served straight off disk.
        if ($asset = $this->resolveAsset($root, $path)) {
            return response()->file($asset, [
                // Guessing from file contents hands back text/plain for .js and
                // .css, and browsers refuse to run a module script with that
                // MIME type — so the extension decides.
                'Content-Type' => $this->mimeFor($asset),
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        return response($this->injectMeta(file_get_contents($index), $path))
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /** Only ever returns a real file that sits inside the build directory. */
    private function resolveAsset(string $root, string $path): ?string
    {
        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        $candidate = realpath($root.'/'.$path);
        $rootReal = realpath($root);

        if (! $candidate || ! $rootReal || ! is_file($candidate)) {
            return null;
        }

        return str_starts_with($candidate, $rootReal) ? $candidate : null;
    }

    private function mimeFor(string $file): string
    {
        return match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'js', 'mjs' => 'text/javascript; charset=UTF-8',
            'css' => 'text/css; charset=UTF-8',
            'json', 'map' => 'application/json; charset=UTF-8',
            'html', 'htm' => 'text/html; charset=UTF-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'avif' => 'image/avif',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'txt' => 'text/plain; charset=UTF-8',
            'xml' => 'application/xml; charset=UTF-8',
            'webmanifest' => 'application/manifest+json',
            default => 'application/octet-stream',
        };
    }

    private function injectMeta(string $html, string $path): string
    {
        $meta = $this->metaFor('/'.ltrim($path, '/'));

        // Replace the shell's static title, then add our block before </head>.
        $html = preg_replace('#<title>.*?</title>#is', '<title>'.e($meta['title']).'</title>', $html, 1) ?? $html;
        $html = preg_replace('#<meta\s+name="description"[^>]*>#i', '', $html, 1) ?? $html;

        return str_ireplace('</head>', $this->renderTags($meta)."</head>", $html);
    }

    /**
     * @return array<string, mixed>
     */
    private function metaFor(string $path): array
    {
        $site = rtrim(config('pulsenews.site_url'), '/');
        $name = config('app.name');

        $default = [
            'title' => $name.' — Breaking News & Analysis',
            'description' => 'Breaking news, in-depth analysis and trending stories from around the world, checked by the '.$name.' desk.',
            'url' => $site.($path === '/' ? '/' : $path),
            'image' => $site.'/favicon.png',
            'type' => 'website',
            'noindex' => false,
            'article' => null,
        ];

        if (preg_match('#^/article/([^/?]+)#', $path, $m)) {
            $post = Post::published()->with(['category', 'tags'])->where('slug', urldecode($m[1]))->first();

            if (! $post) {
                // array_merge, not `+` — the union operator keeps the left
                // side's existing 'noindex' => false and silently wins.
                return array_merge($default, ['noindex' => true]);
            }

            return [
                'title' => $post->title.' | '.$name,
                'description' => $post->excerpt ?: HtmlSanitizer::toText($post->content, 160),
                'url' => $site.'/article/'.$post->slug,
                'image' => $post->image ?: $default['image'],
                'type' => 'article',
                'noindex' => false,
                'article' => [
                    'publishedAt' => optional($post->published_at)->toAtomString(),
                    'modifiedAt' => optional($post->updated_at ?? $post->published_at)->toAtomString(),
                    'section' => $post->category?->name,
                    'tags' => $post->tags->pluck('name')->all(),
                    'author' => $post->author,
                ],
            ];
        }

        if (preg_match('#^/category/([^/?]+)#', $path, $m)) {
            $category = Category::where('slug', urldecode($m[1]))->where('is_active', true)->first();

            if ($category) {
                return array_merge($default, [
                    'title' => $category->name.' News | '.$name,
                    'description' => $category->description ?: 'The latest '.$category->name.' stories from '.$name.'.',
                    'url' => $site.'/category/'.$category->slug,
                ]);
            }
        }

        if (preg_match('#^/tag/([^/?]+)#', $path, $m)) {
            $tag = urldecode($m[1]);

            return array_merge($default, [
                'title' => '#'.$tag.' | '.$name,
                'description' => 'Every '.$name.' story tagged #'.$tag.'.',
                'url' => $site.'/tag/'.$tag,
            ]);
        }

        if (preg_match('#^/(search|login|register|dashboard|onlyadmindashboard)#', $path)) {
            return array_merge($default, ['noindex' => true]);
        }

        $staticPages = [
            '/about' => ['About PulseNews', 'Who we are, how we work, and where our stories come from.'],
            '/ethics' => ['Editorial Standards', 'The standards the PulseNews newsroom holds itself to.'],
            '/privacy' => ['Privacy Policy', 'What data PulseNews collects, why, and what you can do about it.'],
            '/terms' => ['Terms of Service', 'The terms you agree to when you use PulseNews.'],
            '/cookies' => ['Cookie Policy', 'What PulseNews stores in your browser, and why.'],
            '/accessibility' => ['Accessibility', 'How PulseNews works towards being usable by everyone.'],
        ];

        foreach ($staticPages as $prefix => [$title, $description]) {
            if (str_starts_with($path, $prefix)) {
                return array_merge($default, [
                    'title' => $title.' | '.$name,
                    'description' => $description,
                    'url' => $site.$prefix,
                ]);
            }
        }

        if (preg_match('#^/(forgot-password|reset-password)#', $path)) {
            return array_merge($default, ['noindex' => true]);
        }

        if (str_starts_with($path, '/contact')) {
            return array_merge($default, [
                'title' => 'Contact the newsroom | '.$name,
                'description' => 'Send '.$name.' a tip, report an error, or tell us what you think.',
            ]);
        }

        return $default;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function renderTags(array $meta): string
    {
        $name = config('app.name');
        $site = rtrim(config('pulsenews.site_url'), '/');

        // Every tag carries the same marker the client-side SEO helper uses, so
        // once React boots it replaces this set instead of stacking a second
        // copy on top of it.
        $tags = [
            '<meta name="description" content="'.e($meta['description']).'">',
            '<link rel="canonical" href="'.e($meta['url']).'">',
            '<meta name="robots" content="'.($meta['noindex'] ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1').'">',
            '<meta property="og:site_name" content="'.e($name).'">',
            '<meta property="og:type" content="'.e($meta['type']).'">',
            '<meta property="og:title" content="'.e($meta['title']).'">',
            '<meta property="og:description" content="'.e($meta['description']).'">',
            '<meta property="og:url" content="'.e($meta['url']).'">',
            '<meta property="og:image" content="'.e($meta['image']).'">',
            '<meta property="og:locale" content="en_US">',
            '<meta name="twitter:card" content="summary_large_image">',
            '<meta name="twitter:title" content="'.e($meta['title']).'">',
            '<meta name="twitter:description" content="'.e($meta['description']).'">',
            '<meta name="twitter:image" content="'.e($meta['image']).'">',
        ];

        if ($article = $meta['article']) {
            $tags[] = '<meta property="article:published_time" content="'.e((string) $article['publishedAt']).'">';
            $tags[] = '<meta property="article:modified_time" content="'.e((string) $article['modifiedAt']).'">';

            if ($article['section']) {
                $tags[] = '<meta property="article:section" content="'.e($article['section']).'">';
            }

            foreach (array_slice($article['tags'], 0, 8) as $tag) {
                $tags[] = '<meta property="article:tag" content="'.e($tag).'">';
            }

            $jsonLd = [
                '@context' => 'https://schema.org',
                '@type' => 'NewsArticle',
                'headline' => mb_substr($meta['title'], 0, 110),
                'description' => $meta['description'],
                'image' => [$meta['image']],
                'datePublished' => $article['publishedAt'],
                'dateModified' => $article['modifiedAt'],
                'author' => ['@type' => 'Person', 'name' => $article['author'] ?: $name],
                'publisher' => [
                    '@type' => 'Organization',
                    'name' => $name,
                    'logo' => ['@type' => 'ImageObject', 'url' => $site.'/favicon.png'],
                ],
                'mainEntityOfPage' => ['@type' => 'WebPage', '@id' => $meta['url']],
                'articleSection' => $article['section'],
            ];
        } else {
            $jsonLd = [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $name,
                'url' => $site,
                'potentialAction' => [
                    '@type' => 'SearchAction',
                    'target' => $site.'/search?q={search_term_string}',
                    'query-input' => 'required name=search_term_string',
                ],
            ];
        }

        $tags[] = '<script type="application/ld+json">'
            .json_encode($jsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            .'</script>';

        $tags[] = '<link rel="alternate" type="application/rss+xml" title="'.e($name).'" href="'.e($site).'/feed.xml">';

        $marked = array_map(
            fn (string $tag) => preg_replace('/^<(\w+)/', '<$1 '.self::MANAGED_ATTR, $tag, 1),
            $tags
        );

        return "\n    ".implode("\n    ", $marked)."\n  ";
    }
}

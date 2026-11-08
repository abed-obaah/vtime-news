<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\FeedSource;
use App\Models\Post;
use App\Models\Tag;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleXMLElement;
use Throwable;

/**
 * Pulls stories off RSS/Atom feeds and parks them in the moderation queue.
 *
 * Nothing imported here goes live on its own unless the feed is explicitly
 * marked auto_publish — the default path is: fetch -> status "pending" ->
 * an editor proofreads it in the admin panel -> publish.
 */
class RssIngestService
{
    public function __construct(private readonly HtmlSanitizer $sanitizer = new HtmlSanitizer) {}

    /**
     * Fetch every active source that is due for a refresh.
     *
     * @return array{sources:int, imported:int, skipped:int, failed:int, results:array<int, array<string, mixed>>}
     */
    public function fetchAll(bool $force = false): array
    {
        $summary = ['sources' => 0, 'imported' => 0, 'skipped' => 0, 'failed' => 0, 'results' => []];

        FeedSource::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->each(function (FeedSource $source) use (&$summary, $force) {
                if (! $force && ! $source->isDue()) {
                    return;
                }

                $result = $this->fetchSource($source);

                $summary['sources']++;
                $summary['imported'] += $result['imported'];
                $summary['skipped'] += $result['skipped'];
                $summary['failed'] += $result['ok'] ? 0 : 1;
                $summary['results'][] = $result + ['source' => $source->name];
            });

        return $summary;
    }

    /**
     * @return array{ok:bool, imported:int, skipped:int, message:string}
     */
    public function fetchSource(FeedSource $source): array
    {
        $imported = 0;
        $skipped = 0;

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'PulseNewsBot/1.0 (+https://pulsenews.local)',
                'Accept' => 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            ])
                ->timeout((int) config('pulsenews.rss.timeout', 20))
                ->retry(2, 500, throw: false)
                ->get($source->url);

            if (! $response->successful()) {
                return $this->markFailed($source, "Feed responded with HTTP {$response->status()}.");
            }

            $items = $this->parse($response->body());

            if ($items === null) {
                return $this->markFailed($source, 'Feed body could not be parsed as RSS or Atom XML.');
            }

            $limit = (int) config('pulsenews.rss.limit', 25);

            foreach (array_slice($items, 0, $limit) as $item) {
                $this->importItem($source, $item) ? $imported++ : $skipped++;
            }

            $source->forceFill([
                'last_fetched_at' => now(),
                'last_status' => 'ok',
                'last_error' => null,
                'items_imported' => $source->items_imported + $imported,
            ])->save();

            if ($imported > 0) {
                ActivityLog::record(
                    'feed',
                    'Stories imported',
                    "{$imported} new stor".($imported === 1 ? 'y' : 'ies')." pulled from {$source->name}",
                    $source,
                    null
                );
            }

            return [
                'ok' => true,
                'imported' => $imported,
                'skipped' => $skipped,
                'message' => "Imported {$imported}, skipped {$skipped} (already known).",
            ];
        } catch (Throwable $e) {
            Log::warning('RSS fetch failed', ['source' => $source->url, 'error' => $e->getMessage()]);

            return $this->markFailed($source, Str::limit($e->getMessage(), 400));
        }
    }

    /**
     * @return array{ok:bool, imported:int, skipped:int, message:string}
     */
    private function markFailed(FeedSource $source, string $message): array
    {
        $source->forceFill([
            'last_fetched_at' => now(),
            'last_status' => 'failed',
            'last_error' => $message,
        ])->save();

        return ['ok' => false, 'imported' => 0, 'skipped' => 0, 'message' => $message];
    }

    /**
     * Normalise RSS 2.0, RDF and Atom into one flat item shape.
     *
     * @return array<int, array<string, mixed>>|null
     */
    public function parse(string $body): ?array
    {
        $body = trim($body);

        if ($body === '') {
            return null;
        }

        // Strip a UTF-8 BOM and anything before the first tag — some feeds ship
        // stray whitespace or PHP warnings ahead of the declaration.
        $body = preg_replace('/^[\x{FEFF}\s]+/u', '', $body) ?? $body;

        $previous = libxml_use_internal_errors(true);

        try {
            $xml = new SimpleXMLElement($body, LIBXML_NOCDATA | LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        } catch (Throwable) {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);

            return null;
        }

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $nodes = [];

        if (isset($xml->channel->item)) {
            $nodes = $xml->channel->item;              // RSS 2.0
        } elseif (isset($xml->item)) {
            $nodes = $xml->item;                        // RDF / RSS 1.0
        } elseif (isset($xml->entry)) {
            $nodes = $xml->entry;                       // Atom
        } else {
            return null;
        }

        $items = [];

        foreach ($nodes as $node) {
            $parsed = $this->normalise($node);

            if ($parsed !== null) {
                $items[] = $parsed;
            }
        }

        return $items;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function normalise(SimpleXMLElement $node): ?array
    {
        $ns = $node->getNamespaces(true);
        $content = isset($ns['content']) ? $node->children($ns['content']) : null;
        $dc = isset($ns['dc']) ? $node->children($ns['dc']) : null;
        $media = isset($ns['media']) ? $node->children($ns['media']) : null;

        $title = $this->text($node->title);

        if ($title === '') {
            return null;
        }

        $link = $this->extractLink($node);

        $body = '';
        if ($content !== null && isset($content->encoded)) {
            $body = (string) $content->encoded;
        }
        if (trim($body) === '' && isset($node->content)) {
            $body = (string) $node->content;
        }
        if (trim($body) === '' && isset($node->description)) {
            $body = (string) $node->description;
        }
        if (trim($body) === '' && isset($node->summary)) {
            $body = (string) $node->summary;
        }

        $summary = '';
        foreach (['description', 'summary', 'subtitle'] as $field) {
            if (isset($node->$field) && trim((string) $node->$field) !== '') {
                $summary = (string) $node->$field;
                break;
            }
        }

        $date = null;
        foreach (['pubDate', 'published', 'updated', 'date'] as $field) {
            if (isset($node->$field) && trim((string) $node->$field) !== '') {
                $date = (string) $node->$field;
                break;
            }
        }
        if ($date === null && $dc !== null && isset($dc->date)) {
            $date = (string) $dc->date;
        }

        $author = '';
        if (isset($node->author->name)) {
            $author = $this->text($node->author->name);
        } elseif (isset($node->author)) {
            $author = $this->text($node->author);
        }
        if ($author === '' && $dc !== null && isset($dc->creator)) {
            $author = trim((string) $dc->creator);
        }

        $guid = '';
        foreach (['guid', 'id'] as $field) {
            if (isset($node->$field) && trim((string) $node->$field) !== '') {
                $guid = trim((string) $node->$field);
                break;
            }
        }

        $categories = [];
        if (isset($node->category)) {
            foreach ($node->category as $category) {
                $value = trim((string) $category) ?: trim((string) ($category['term'] ?? ''));

                if ($value !== '') {
                    $categories[] = $value;
                }
            }
        }

        return [
            'title' => $title,
            'link' => $link,
            'guid' => $guid !== '' ? $guid : $link,
            'content' => $body,
            'summary' => $summary,
            'date' => $date,
            'author' => $author,
            'image' => $this->extractImage($node, $media, $body),
            'categories' => array_slice(array_unique($categories), 0, 6),
        ];
    }

    private function text(mixed $value): string
    {
        return trim(html_entity_decode((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private function extractLink(SimpleXMLElement $node): string
    {
        if (isset($node->link)) {
            foreach ($node->link as $link) {
                $href = trim((string) ($link['href'] ?? ''));
                $rel = strtolower(trim((string) ($link['rel'] ?? 'alternate')));

                if ($href !== '' && in_array($rel, ['alternate', ''], true)) {
                    return $href;
                }

                $plain = trim((string) $link);

                if ($plain !== '') {
                    return $plain;
                }
            }
        }

        return '';
    }

    private function extractImage(SimpleXMLElement $node, ?SimpleXMLElement $media, string $body): ?string
    {
        if ($media !== null) {
            foreach (['content', 'thumbnail'] as $tag) {
                if (isset($media->$tag)) {
                    foreach ($media->$tag as $entry) {
                        // children() scopes attribute lookups to the namespace,
                        // so plain attributes need attributes() explicitly.
                        $attributes = $entry->attributes();
                        $url = trim((string) ($attributes['url'] ?? ''));

                        if ($url !== '' && $this->looksLikeImage($url, (string) ($attributes['type'] ?? ''))) {
                            return $url;
                        }
                    }
                }
            }
        }

        if (isset($node->enclosure)) {
            foreach ($node->enclosure as $enclosure) {
                $url = trim((string) ($enclosure['url'] ?? ''));
                $type = (string) ($enclosure['type'] ?? '');

                if ($url !== '' && $this->looksLikeImage($url, $type)) {
                    return $url;
                }
            }
        }

        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $body, $matches)) {
            $url = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');

            if (Str::startsWith($url, ['http://', 'https://'])) {
                return $url;
            }
        }

        return null;
    }

    private function looksLikeImage(string $url, string $type): bool
    {
        if (Str::startsWith(strtolower($type), 'image/')) {
            return true;
        }

        if ($type !== '' && ! Str::startsWith(strtolower($type), 'image/')) {
            return false;
        }

        $path = strtolower((string) parse_url($url, PHP_URL_PATH));

        return (bool) preg_match('/\.(jpe?g|png|gif|webp|avif)$/', $path);
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function importItem(FeedSource $source, array $item): bool
    {
        $guidHash = hash('sha256', $source->id.'|'.($item['guid'] ?: $item['title']));

        if (Post::withTrashed()->where('guid_hash', $guidHash)->exists()) {
            return false;
        }

        $content = HtmlSanitizer::clean($item['content']);
        $excerpt = HtmlSanitizer::toText($item['summary'] ?: $item['content'], 260);

        if (trim(strip_tags($content)) === '' && $excerpt === '') {
            return false;
        }

        if (trim(strip_tags($content)) === '') {
            $content = '<p>'.e($excerpt).'</p>';
        }

        $publishedAt = $this->parseDate($item['date']);
        $autoPublish = $source->auto_publish;

        $post = new Post([
            'title' => Str::limit(trim($item['title']), 480, ''),
            'slug' => Post::uniqueSlug($item['title']),
            'excerpt' => $excerpt,
            'content' => $content,
            'image' => $item['image'],
            'category_id' => $source->category_id ?? $this->guessCategoryId($item['categories']),
            'author' => $item['author'] !== '' ? Str::limit($item['author'], 120, '') : $source->name,
            'status' => $autoPublish ? 'published' : 'pending',
            'source' => 'rss',
            'feed_source_id' => $source->id,
            'source_name' => $source->name,
            'source_url' => $item['link'] ?: null,
            'guid_hash' => $guidHash,
            'read_time' => $this->readingTime($content),
            'published_at' => $autoPublish ? ($publishedAt ?? now()) : $publishedAt,
        ]);

        $post->save();

        $this->syncTags($post, $item['categories']);

        return true;
    }

    /**
     * @param  array<int, string>  $names
     */
    private function syncTags(Post $post, array $names): void
    {
        $ids = [];

        foreach ($names as $name) {
            $tag = Tag::fromName($name);

            if ($tag) {
                $ids[] = $tag->id;
            }
        }

        if ($ids !== []) {
            $post->tags()->sync(array_unique($ids));
        }
    }

    /**
     * @param  array<int, string>  $names
     */
    private function guessCategoryId(array $names): ?int
    {
        foreach ($names as $name) {
            $slug = Str::slug($name);

            if ($slug === '') {
                continue;
            }

            $category = Category::where('slug', $slug)->orWhere('name', $name)->first();

            if ($category) {
                return $category->id;
            }
        }

        return null;
    }

    private function parseDate(?string $value): ?CarbonImmutable
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        // Feeds routinely ship an RFC-822 date whose weekday name disagrees
        // with the date ("Mon, 01 Sep 2026" when the 1st is a Tuesday). PHP
        // treats the name as a relative modifier and silently shifts the day,
        // so drop it and trust the numbers.
        $value = preg_replace('/^[A-Za-z]{3,9},\s*/', '', $value) ?? $value;

        try {
            $date = CarbonImmutable::parse($value);
        } catch (Throwable) {
            return null;
        }

        // A feed dated in the future (bad timezone data) would hide the story.
        return $date->isFuture() ? CarbonImmutable::now() : $date;
    }

    private function readingTime(string $html): int
    {
        $words = str_word_count(strip_tags($html));

        return max(1, (int) ceil($words / 200));
    }
}

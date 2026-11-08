<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

/**
 * Whitelist-based HTML cleaner.
 *
 * Article bodies are rendered with dangerouslySetInnerHTML on the SPA, and a
 * chunk of them arrives from third-party RSS feeds, so everything that is not
 * explicitly allowed gets removed here before it is ever stored.
 */
class HtmlSanitizer
{
    /** @var array<string, string[]> tag => allowed attributes */
    private const ALLOWED = [
        'p' => [],
        'br' => [],
        'hr' => [],
        'h1' => [], 'h2' => [], 'h3' => [], 'h4' => [], 'h5' => [], 'h6' => [],
        'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [],
        'blockquote' => ['cite'],
        'ul' => [], 'ol' => ['start'], 'li' => [],
        'a' => ['href', 'title', 'target', 'rel'],
        'img' => ['src', 'alt', 'title', 'width', 'height'],
        'figure' => [], 'figcaption' => [],
        'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => ['colspan', 'rowspan'], 'td' => ['colspan', 'rowspan'],
        'code' => [], 'pre' => [],
        'span' => [], 'div' => [], 'section' => [], 'article' => [],
        'sub' => [], 'sup' => [], 'small' => [], 'mark' => [],
        'time' => ['datetime'],
    ];

    private const STRIP_ENTIRELY = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'noscript', 'svg', 'math', 'link', 'meta', 'base'];

    public static function clean(?string $html): string
    {
        $html = trim((string) $html);

        if ($html === '') {
            return '';
        }

        $previous = libxml_use_internal_errors(true);
        $doc = new DOMDocument('1.0', 'UTF-8');

        // The wrapper keeps DOMDocument from bolting on <html><body>, and the
        // XML declaration forces UTF-8 interpretation of the fragment.
        $loaded = $doc->loadHTML(
            '<?xml encoding="UTF-8"?><div id="pulsenews-root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            return e(strip_tags($html));
        }

        $xpath = new DOMXPath($doc);
        $root = $xpath->query('//*[@id="pulsenews-root"]')?->item(0) ?? $doc->documentElement;

        if (! $root) {
            return e(strip_tags($html));
        }

        // Comments can hide conditional-comment payloads; drop them all.
        foreach (iterator_to_array($xpath->query('//comment()') ?: []) as $comment) {
            $comment->parentNode?->removeChild($comment);
        }

        self::scrub($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /**
     * Convert HTML to a plain-text summary (used for excerpts).
     */
    public static function toText(?string $html, int $limit = 0): string
    {
        $text = html_entity_decode(strip_tags((string) $html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        if ($limit > 0 && mb_strlen($text) > $limit) {
            $cut = mb_substr($text, 0, $limit);
            $lastSpace = mb_strrpos($cut, ' ');
            $text = rtrim($lastSpace !== false ? mb_substr($cut, 0, $lastSpace) : $cut, " .,;:-").'…';
        }

        return $text;
    }

    private static function scrub(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->nodeName);

            if (in_array($tag, self::STRIP_ENTIRELY, true)) {
                $child->parentNode?->removeChild($child);

                continue;
            }

            if (! array_key_exists($tag, self::ALLOWED)) {
                // Unknown wrapper: keep the text, lose the tag.
                self::scrub($child);
                self::unwrap($child);

                continue;
            }

            foreach (iterator_to_array($child->attributes ?? []) as $attribute) {
                $name = strtolower($attribute->nodeName);

                if (! in_array($name, self::ALLOWED[$tag], true)) {
                    $child->removeAttribute($attribute->nodeName);

                    continue;
                }

                if (in_array($name, ['href', 'src'], true) && ! self::safeUrl($attribute->nodeValue)) {
                    $child->removeAttribute($attribute->nodeName);
                }
            }

            if ($tag === 'a' && $child->getAttribute('href') !== '') {
                $child->setAttribute('target', '_blank');
                $child->setAttribute('rel', 'noopener noreferrer nofollow');
            }

            if ($tag === 'img' && $child->getAttribute('src') === '') {
                $child->parentNode?->removeChild($child);

                continue;
            }

            self::scrub($child);
        }
    }

    private static function unwrap(DOMElement $element): void
    {
        $parent = $element->parentNode;

        if (! $parent) {
            return;
        }

        while ($element->firstChild) {
            $parent->insertBefore($element->firstChild, $element);
        }

        $parent->removeChild($element);
    }

    private static function safeUrl(?string $url): bool
    {
        $url = trim((string) $url);

        if ($url === '') {
            return false;
        }

        // Relative URLs and anchors are fine; absolute ones must be http(s).
        if (str_starts_with($url, '/') || str_starts_with($url, '#')) {
            return true;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https'], true);
    }
}

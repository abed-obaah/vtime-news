/**
 * Document-head management for the SPA.
 *
 * Google renders JavaScript, so these client-side tags are what it indexes on
 * in-app navigation. Social scrapers (Facebook, X, LinkedIn, WhatsApp) do NOT
 * run JS — for those, Laravel injects the same tags into the HTML shell before
 * it is served. See backend/app/Http/Controllers/SpaController.php.
 */

export const SITE_NAME = 'Vtime News';
export const SITE_URL =
    import.meta.env.VITE_SITE_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');

const DEFAULT_DESCRIPTION =
    'Breaking news, in-depth analysis and trending stories from around the world, checked by the Vtime News desk.';

/** Tags we own, so a route change can clear the previous page's set. */
const MANAGED = 'data-pulsenews-seo';

const clearManaged = () => {
    document.head
        .querySelectorAll(`[${MANAGED}]`)
        .forEach((el) => el.remove());
};

const addTag = (tag, attributes) => {
    const el = document.createElement(tag);
    Object.entries(attributes).forEach(([k, v]) => el.setAttribute(k, v));
    el.setAttribute(MANAGED, '');
    document.head.appendChild(el);
};

const meta = (nameOrProperty, content, useProperty = false) => {
    if (!content) return;
    addTag('meta', { [useProperty ? 'property' : 'name']: nameOrProperty, content: String(content) });
};

const truncate = (text, max = 160) => {
    const clean = String(text || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (clean.length <= max) return clean;

    const cut = clean.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\-—]$/, '') + '…';
};

const absolute = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return SITE_URL + (path.startsWith('/') ? path : `/${path}`);
};

/**
 * @param {object} options
 * @param {string} [options.title]        page title (site name is appended)
 * @param {string} [options.description]
 * @param {string} [options.path]         canonical path, e.g. "/article/foo"
 * @param {string} [options.image]        absolute or site-relative image URL
 * @param {'website'|'article'} [options.type]
 * @param {boolean} [options.noIndex]     keep this page out of search results
 * @param {object} [options.article]      { publishedAt, modifiedAt, section, tags[], author }
 * @param {Array} [options.breadcrumbs]   [{ name, path }]
 * @param {object} [options.jsonLd]       extra structured data to append
 */
export function applySeo({
    title,
    description,
    path,
    image,
    type = 'website',
    noIndex = false,
    article = null,
    breadcrumbs = null,
    jsonLd = null,
} = {}) {
    if (typeof document === 'undefined') return;

    clearManaged();

    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Breaking News & Analysis`;
    const desc = truncate(description || DEFAULT_DESCRIPTION);
    const url = absolute(path || (typeof window !== 'undefined' ? window.location.pathname : '/'));
    const img = absolute(image) || absolute('/favicon.png');

    document.title = fullTitle;

    // Standard
    meta('description', desc);
    addTag('link', { rel: 'canonical', href: url });

    // Feed autodiscovery — the server injects this too, but clearManaged()
    // wipes the server's copy when React takes over, so re-add it here.
    addTag('link', {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: `${SITE_NAME} — Latest News`,
        href: absolute('/feed.xml'),
    });
    meta('robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');

    // Open Graph
    meta('og:site_name', SITE_NAME, true);
    meta('og:type', type, true);
    meta('og:title', fullTitle, true);
    meta('og:description', desc, true);
    meta('og:url', url, true);
    meta('og:image', img, true);
    meta('og:locale', 'en_US', true);

    // X / Twitter
    meta('twitter:card', img ? 'summary_large_image' : 'summary');
    meta('twitter:title', fullTitle);
    meta('twitter:description', desc);
    meta('twitter:image', img);

    if (type === 'article' && article) {
        meta('article:published_time', article.publishedAt, true);
        meta('article:modified_time', article.modifiedAt || article.publishedAt, true);
        meta('article:section', article.section, true);
        (article.tags || []).slice(0, 8).forEach((tag) => meta('article:tag', tag, true));
        if (article.author) meta('author', article.author);
    }

    // Structured data
    const graph = [];

    if (type === 'article' && article) {
        graph.push({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: truncate(title, 110),
            description: desc,
            image: img ? [img] : undefined,
            datePublished: article.publishedAt,
            dateModified: article.modifiedAt || article.publishedAt,
            author: { '@type': 'Person', name: article.author || SITE_NAME },
            publisher: {
                '@type': 'Organization',
                name: SITE_NAME,
                logo: { '@type': 'ImageObject', url: absolute('/favicon.png') },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': url },
            articleSection: article.section,
            keywords: (article.tags || []).join(', ') || undefined,
        });
    } else {
        graph.push({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE_URL}/search?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
            },
        });
    }

    if (breadcrumbs?.length) {
        graph.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: crumb.name,
                item: absolute(crumb.path),
            })),
        });
    }

    if (jsonLd) graph.push(jsonLd);

    graph.forEach((node) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(node, (_, v) => (v === undefined ? undefined : v));
        script.setAttribute(MANAGED, '');
        document.head.appendChild(script);
    });
}

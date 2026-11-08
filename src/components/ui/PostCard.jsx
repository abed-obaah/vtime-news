import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatRelativeDate } from '@/utils/helpers';

const FALLBACK_IMAGE =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#E2E8F0"/><text x="400" y="260" font-family="system-ui, sans-serif" font-size="28" fill="#94A3B8" text-anchor="middle">PulseNews</text></svg>`
    );

/** Feed images are third-party and go missing — swap in a placeholder. */
const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied) return;
    event.currentTarget.dataset.fallbackApplied = 'true';
    event.currentTarget.src = FALLBACK_IMAGE;
};

const imageOf = (post) => post?.image || FALLBACK_IMAGE;

function CategoryBadge({ post, className = '' }) {
    if (!post.categoryName) return null;

    return (
        <span
            className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded-full ${className}`}
            style={{ backgroundColor: post.categoryColor || '#6B7280' }}
        >
            {post.categoryName}
        </span>
    );
}

export function PostCardLarge({ post }) {
    if (!post) return null;

    return (
        <Link to={`/article/${post.slug}`} className="group block">
            <article className="relative rounded-2xl overflow-hidden h-120 lg:h-135">
                <img
                    src={imageOf(post)}
                    onError={handleImageError}
                    alt={post.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {post.isBreaking && (
                            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-primary rounded-full animate-pulse">
                                Breaking
                            </span>
                        )}
                        <CategoryBadge post={post} />
                    </div>
                    <h2 className="text-2xl lg:text-4xl font-bold text-white leading-tight mb-3 font-display text-balance group-hover:text-primary-light transition-colors">
                        {post.title}
                    </h2>
                    <p className="text-white/70 text-sm lg:text-base line-clamp-2 mb-4 max-w-2xl">
                        {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-white/60 text-xs">
                        <span className="font-medium text-white/80">{post.author}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Clock size={12} /> {post.readTime} min
                        </span>
                        <span>·</span>
                        <span>{formatRelativeDate(post.publishedAt)}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
}

export function PostCardMedium({ post }) {
    if (!post) return null;

    return (
        <Link to={`/article/${post.slug}`} className="group block h-full">
            <article className="bg-white dark:bg-surface-dark-alt rounded-xl overflow-hidden border border-border dark:border-border-dark transition-all duration-300 h-full flex flex-col hover:shadow-md">
                <div className="relative overflow-hidden aspect-16/10">
                    <img
                        src={imageOf(post)}
                        onError={handleImageError}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {post.isBreaking && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-primary rounded-md">
                            Breaking
                        </span>
                    )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors font-display">
                        {post.title}
                    </h3>
                    <p className="text-sm text-text-secondary dark:text-text-muted line-clamp-2 mb-4 flex-1">
                        {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{formatRelativeDate(post.publishedAt)}</span>
                        {post.categoryName && (
                            <span className="font-semibold" style={{ color: post.categoryColor || undefined }}>
                                {post.categoryName}
                            </span>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}

export function PostCardSmall({ post, index }) {
    if (!post) return null;

    return (
        <Link to={`/article/${post.slug}`} className="group flex gap-4 items-start">
            {index !== undefined && (
                <span className="text-3xl font-black text-primary/20 dark:text-primary/30 shrink-0 w-8 leading-none pt-1">
                    {String(index + 1).padStart(2, '0')}
                </span>
            )}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary dark:text-text-inverse leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                    <span>{formatRelativeDate(post.publishedAt)}</span>
                </div>
            </div>
            <img
                src={imageOf(post)}
                onError={handleImageError}
                alt=""
                loading="lazy"
                className="w-20 h-16 rounded-lg object-cover shrink-0"
            />
        </Link>
    );
}

export function PostCardHorizontal({ post }) {
    if (!post) return null;

    return (
        <Link to={`/article/${post.slug}`} className="group flex flex-col sm:flex-row gap-5 items-start">
            <div className="relative w-full sm:w-64 shrink-0 aspect-16/10 rounded-xl overflow-hidden">
                <img
                    src={imageOf(post)}
                    onError={handleImageError}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div className="flex-1 min-w-0 py-1">
                <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors font-display">
                    {post.title}
                </h3>
                <p className="text-sm text-text-secondary dark:text-text-muted line-clamp-2 mb-3">
                    {post.excerpt}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span>{post.author}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime} min
                    </span>
                    <span>·</span>
                    <span>{formatRelativeDate(post.publishedAt)}</span>
                </div>
            </div>
        </Link>
    );
}

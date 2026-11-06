import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Bookmark, Check, Clock, ExternalLink, Eye, Heart, Link2, Star,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatDateTime, formatNumber } from '@/utils/helpers';
import { PostCardMedium, PostCardSmall } from '@/components/ui/PostCard';
import CommentSection from '@/components/ui/CommentSection';
import AdBanner from '@/components/ui/AdBanner';
import { ErrorState, LoadingState, Notice } from '@/components/ui/States';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo } from '@/hooks/useSeo';

export default function ArticlePage() {
    const { slug } = useParams();
    const { isAuthenticated } = useAuth();

    const { data: post, loading, error, refetch } = useApi(() => publicApi.post(slug), [slug]);
    const { data: related } = useApi(() => publicApi.related(slug), [slug], { initialData: [] });
    const { data: trending } = useApi(
        () => publicApi.posts({ sort: 'trending', per_page: 6 }).then((r) => r.items),
        [],
        { initialData: [] }
    );

    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(0);
    const [saved, setSaved] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [rating, setRating] = useState(0);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const [copied, setCopied] = useState(false);
    const [commentCount, setCommentCount] = useState(0);
    const [seededId, setSeededId] = useState(null);

    // Re-seed the interactive state whenever a different article loads.
    // Adjusting state during render is React's documented pattern for
    // resetting state when the data a component is showing changes.
    if (post && seededId !== post.id) {
        setSeededId(post.id);
        setLiked(Boolean(post.viewer?.liked));
        setSaved(Boolean(post.viewer?.saved));
        setUserRating(post.viewer?.rating ?? 0);
        setLikes(post.likes ?? 0);
        setRating(post.rating ?? 0);
        setCommentCount(post.commentsCount ?? 0);
        setNotice(null);
        setCopied(false);
    }

    useSeo(
        post
            ? {
                  title: post.title,
                  description: post.excerpt,
                  path: `/article/${post.slug}`,
                  image: post.image,
                  type: 'article',
                  article: {
                      publishedAt: post.publishedAt,
                      modifiedAt: post.updatedAt,
                      section: post.categoryName,
                      tags: post.tags,
                      author: post.author,
                  },
                  breadcrumbs: [
                      { name: 'Home', path: '/' },
                      ...(post.category
                          ? [{ name: post.categoryName, path: `/category/${post.category}` }]
                          : []),
                      { name: post.title, path: `/article/${post.slug}` },
                  ],
              }
            : null
    );

    const requireSignIn = useCallback(() => {
        setNotice({ tone: 'info', text: 'Sign in to like, save and rate stories.' });
        return false;
    }, []);

    const toggleLike = async () => {
        if (!isAuthenticated) return requireSignIn();
        if (busy) return;

        setBusy(true);
        try {
            const result = await publicApi.toggleLike(post.slug);
            setLiked(result.liked);
            setLikes(result.likes);
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not register that.' });
        } finally {
            setBusy(false);
        }
    };

    const toggleSave = async () => {
        if (!isAuthenticated) return requireSignIn();
        if (busy) return;

        setBusy(true);
        try {
            const result = await publicApi.toggleBookmark(post.slug);
            setSaved(result.saved);
            setNotice({ tone: 'success', text: result.saved ? 'Saved to your dashboard.' : 'Removed from saved.' });
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not save that.' });
        } finally {
            setBusy(false);
        }
    };

    const rate = async (value) => {
        if (!isAuthenticated) return requireSignIn();
        if (busy) return;

        setBusy(true);
        try {
            const result = await publicApi.ratePost(post.slug, value);
            setUserRating(result.yourRating);
            setRating(result.rating);
            setNotice({ tone: 'success', text: 'Thanks for rating this story.' });
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not save your rating.' });
        } finally {
            setBusy(false);
        }
    };

    const copyLink = async () => {
        const url = window.location.href;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setNotice({ tone: 'info', text: url });
        }
    };

    const share = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: post.title, text: post.excerpt, url: window.location.href });
                return;
            } catch {
                /* the reader dismissed the share sheet */
            }
        }
        copyLink();
    };

    if (loading && !post) return <LoadingState label="Loading article…" />;

    if (error) {
        if (error.status === 404) {
            return (
                <div className="max-w-350 mx-auto px-4 py-20 text-center">
                    <h1 className="text-4xl font-bold text-text-primary dark:text-text-inverse mb-4 font-display">
                        Article Not Found
                    </h1>
                    <p className="text-text-muted mb-6">
                        The article you&apos;re looking for doesn&apos;t exist or has been removed.
                    </p>
                    <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                        <ArrowLeft size={18} /> Back to Home
                    </Link>
                </div>
            );
        }

        return <ErrorState error={error} onRetry={refetch} />;
    }

    if (!post) return null;

    const relatedPosts = related || [];

    return (
        <article className="max-w-350 mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span>/</span>
                {post.category && (
                    <>
                        <Link to={`/category/${post.category}`} className="hover:text-primary transition-colors">
                            {post.categoryName}
                        </Link>
                        <span>/</span>
                    </>
                )}
                <span className="text-text-secondary dark:text-text-muted truncate">{post.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    <header className="mb-8">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {post.category && (
                                <Link
                                    to={`/category/${post.category}`}
                                    className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded-full"
                                    style={{ backgroundColor: post.categoryColor || '#6B7280' }}
                                >
                                    {post.categoryName}
                                </Link>
                            )}
                            {post.isBreaking && (
                                <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-primary rounded-full animate-pulse">
                                    Breaking
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-text-primary dark:text-text-inverse leading-tight mb-4 font-display text-balance">
                            {post.title}
                        </h1>
                        <p className="text-lg text-text-secondary dark:text-text-muted leading-relaxed mb-6">
                            {post.excerpt}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted pb-6 border-b border-border dark:border-border-dark">
                            <span className="font-semibold text-text-primary dark:text-text-inverse">{post.author}</span>
                            <span>·</span>
                            <span>{formatDateTime(post.publishedAt)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock size={14} />{post.readTime} min read</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Eye size={14} />{formatNumber(post.views)} views</span>
                        </div>

                        {post.source === 'rss' && post.sourceUrl && (
                            <p className="mt-4 text-xs text-text-muted">
                                Originally reported by {post.sourceName || 'a wire partner'} —{' '}
                                <a
                                    href={post.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    read the original
                                </a>
                            </p>
                        )}
                    </header>

                    {post.image && (
                        <div className="mb-8 rounded-2xl overflow-hidden">
                            <img src={post.image} alt={post.title} className="w-full h-auto max-h-125 object-cover" />
                        </div>
                    )}

                    <div
                        className="prose max-w-none text-gray-900 dark:text-white"
                        dangerouslySetInnerHTML={{ __html: post.content || '' }}
                    />

                    <AdBanner placement="inline" />

                    {post.tags?.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-border dark:border-border-dark">
                            <h4 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        to={`/tag/${tag}`}
                                        className="px-3 py-1.5 text-xs font-medium bg-surface-alt dark:bg-surface-dark-alt text-text-secondary dark:text-text-muted rounded-full border border-border dark:border-border-dark hover:text-primary hover:border-primary transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Engagement */}
                    <div className="mt-8 p-5 bg-surface-alt dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark">
                        {notice && (
                            <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                                {notice.text}
                            </Notice>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleLike}
                                    disabled={busy}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${liked ? 'bg-primary/10 text-primary' : 'bg-white dark:bg-surface-dark text-text-secondary dark:text-text-muted hover:text-primary'} border border-border dark:border-border-dark disabled:opacity-60`}
                                >
                                    <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                                    {likes}
                                </button>
                                <button
                                    onClick={toggleSave}
                                    disabled={busy}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${saved ? 'bg-accent/10 text-accent' : 'bg-white dark:bg-surface-dark text-text-secondary dark:text-text-muted hover:text-accent'} border border-border dark:border-border-dark disabled:opacity-60`}
                                >
                                    <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
                                    {saved ? 'Saved' : 'Save'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-text-muted">Rate:</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => rate(star)}
                                            disabled={busy}
                                            aria-label={`Rate ${star} out of 5`}
                                            className={`transition-colors cursor-pointer ${star <= userRating ? 'text-accent' : 'text-text-muted/30'} hover:text-accent disabled:cursor-not-allowed`}
                                        >
                                            <Star size={20} fill={star <= userRating ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                </div>
                                <span className="text-xs text-text-muted ml-1">({rating || '—'})</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-sm text-text-muted">Share:</span>
                                <button
                                    onClick={copyLink}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-surface-alt dark:hover:bg-surface-dark text-text-secondary dark:text-text-muted border border-border dark:border-border-dark transition-colors cursor-pointer"
                                >
                                    {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? 'Copied' : 'Copy Link'}
                                </button>
                                <button
                                    onClick={share}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-surface-alt dark:hover:bg-surface-dark text-text-secondary dark:text-text-muted border border-border dark:border-border-dark transition-colors cursor-pointer"
                                >
                                    <ExternalLink size={14} /> Share
                                </button>
                            </div>
                        </div>

                        {commentCount > 0 && (
                            <p className="text-xs text-text-muted mt-3">
                                {commentCount} {commentCount === 1 ? 'comment' : 'comments'} on this story
                            </p>
                        )}
                    </div>

                    <CommentSection slug={post.slug} onCountChange={setCommentCount} />
                </div>

                {/* Sidebar */}
                <aside className="lg:col-span-1">
                    <div className="sticky top-20 space-y-6">
                        {relatedPosts.length > 0 && (
                            <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                                <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display mb-4">
                                    Related Stories
                                </h3>
                                <div className="space-y-5">
                                    {relatedPosts.map((p) => (
                                        <PostCardSmall key={p.id} post={p} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <AdBanner placement="sidebar" />

                        {(trending || []).length > 0 && (
                            <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                                <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display mb-4">
                                    🔥 Most Read
                                </h3>
                                <div className="space-y-5">
                                    {trending.map((p, i) => (
                                        <PostCardSmall key={p.id} post={p} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {relatedPosts.length > 0 && (
                <section className="mt-16 pt-10 border-t border-border dark:border-border-dark">
                    <h2 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display mb-6">
                        More From {post.categoryName || 'Vtime News'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relatedPosts.map((p) => (
                            <PostCardMedium key={p.id} post={p} />
                        ))}
                    </div>
                </section>
            )}
        </article>
    );
}

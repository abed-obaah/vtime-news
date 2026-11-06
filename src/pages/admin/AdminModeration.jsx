import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CheckCircle, ExternalLink, Inbox, Loader2, Pencil, RefreshCw, Rss, XCircle,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

/**
 * The proof-reading desk: everything the RSS crawler pulled in, waiting for a
 * human to read it, edit it, and either publish or spike it.
 */
export default function AdminModeration() {
    const [selected, setSelected] = useState(() => new Set());
    const [busyId, setBusyId] = useState(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [notice, setNotice] = useState(null);
    const [preview, setPreview] = useState(null);

    const queue = useApi(
        () => adminApi.posts({ status: 'pending', sort: 'latest', per_page: 50 }),
        []
    );

    const posts = queue.data?.items ?? [];
    const total = queue.data?.meta?.total ?? posts.length;

    const reload = async () => {
        setSelected(new Set());
        setPreview(null);
        await queue.refetch();
    };

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelected((prev) => (prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id))));
    };

    const act = async (post, action) => {
        setBusyId(post.id);
        setNotice(null);

        try {
            if (action === 'publish') await adminApi.publishPost(post.id);
            else await adminApi.rejectPost(post.id);

            setNotice({
                tone: 'success',
                text: action === 'publish' ? `“${post.title}” is live.` : `“${post.title}” was spiked.`,
            });
            await reload();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    const bulk = async (action) => {
        if (selected.size === 0) return;

        const ids = [...selected].map(Number);

        if (action === 'reject' && !window.confirm(`Reject ${ids.length} stor${ids.length === 1 ? 'y' : 'ies'}?`)) {
            return;
        }

        setBulkBusy(true);
        setNotice(null);

        try {
            const result = await adminApi.bulkPosts(ids, action);
            setNotice({ tone: 'success', text: result.message });
            await reload();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'The bulk action failed.' });
        } finally {
            setBulkBusy(false);
        }
    };

    const pullFeeds = async () => {
        setFetching(true);
        setNotice(null);

        try {
            const result = await adminApi.fetchAllFeeds();
            setNotice({ tone: 'info', text: result.message });
            await reload();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not reach the feeds.' });
        } finally {
            setFetching(false);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Moderation Queue
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        {total} stor{total === 1 ? 'y' : 'ies'} pulled from the wire, waiting for an editor.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={pullFeeds}
                        disabled={fetching}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        {fetching ? <Loader2 size={16} className="animate-spin" /> : <Rss size={16} />}
                        {fetching ? 'Fetching…' : 'Fetch feeds now'}
                    </button>
                    <button
                        onClick={reload}
                        disabled={queue.loading}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        <RefreshCw size={16} className={queue.loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {/* Bulk bar */}
            {posts.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark">
                    <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-muted cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selected.size === posts.length && posts.length > 0}
                            onChange={toggleAll}
                            className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        Select all on this page
                    </label>

                    <span className="text-xs text-text-muted">{selected.size} selected</span>

                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            onClick={() => bulk('publish')}
                            disabled={selected.size === 0 || bulkBusy}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-success rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {bulkBusy ? <Spinner size={13} /> : <CheckCircle size={14} />} Publish selected
                        </button>
                        <button
                            onClick={() => bulk('reject')}
                            disabled={selected.size === 0 || bulkBusy}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-danger rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <XCircle size={14} /> Reject selected
                        </button>
                    </div>
                </div>
            )}

            {queue.error ? (
                <ErrorState error={queue.error} onRetry={queue.refetch} />
            ) : queue.loading && posts.length === 0 ? (
                <LoadingState label="Loading the queue…" />
            ) : posts.length === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="The queue is clear"
                    message="Nothing is waiting for review. Pull the feeds to bring in the latest wire stories."
                    action={
                        <button
                            onClick={pullFeeds}
                            disabled={fetching}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            {fetching ? <Spinner size={15} /> : <Rss size={15} />} Fetch feeds now
                        </button>
                    }
                />
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => {
                        const isOpen = preview === post.id;

                        return (
                            <article
                                key={post.id}
                                className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden"
                            >
                                <div className="p-5 flex flex-col sm:flex-row gap-4">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(post.id)}
                                        onChange={() => toggle(post.id)}
                                        className="w-4 h-4 mt-1 accent-primary shrink-0 cursor-pointer"
                                        aria-label={`Select ${post.title}`}
                                    />

                                    {post.image && (
                                        <img
                                            src={post.image}
                                            alt=""
                                            loading="lazy"
                                            className="w-full sm:w-40 h-28 sm:h-24 rounded-lg object-cover shrink-0"
                                        />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                                Pending
                                            </span>
                                            {post.categoryName && (
                                                <span
                                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                                    style={{
                                                        backgroundColor: `${post.categoryColor}20`,
                                                        color: post.categoryColor,
                                                    }}
                                                >
                                                    {post.categoryName}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-text-muted">
                                                {post.sourceName || 'Manual'} · {formatRelativeDate(post.publishedAt || post.createdAt)}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-text-primary dark:text-text-inverse leading-snug mb-1.5">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-text-muted line-clamp-2">{post.excerpt}</p>

                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <button
                                                onClick={() => act(post, 'publish')}
                                                disabled={busyId === post.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-success rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                                            >
                                                {busyId === post.id ? <Spinner size={13} /> : <CheckCircle size={14} />} Publish
                                            </button>

                                            <Link
                                                to={`/onlyadmindashboard/posts/${post.id}/edit`}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-info border border-info/30 rounded-lg hover:bg-info/10 transition-colors"
                                            >
                                                <Pencil size={14} /> Proofread &amp; edit
                                            </Link>

                                            <button
                                                onClick={() => act(post, 'reject')}
                                                disabled={busyId === post.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <XCircle size={14} /> Reject
                                            </button>

                                            <button
                                                onClick={() => setPreview(isOpen ? null : post.id)}
                                                className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
                                            >
                                                {isOpen ? 'Hide full text' : 'Read full text'}
                                            </button>

                                            {post.sourceUrl && (
                                                <a
                                                    href={post.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
                                                >
                                                    <ExternalLink size={13} /> Original
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isOpen && <PreviewBody id={post.id} />}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** Loads the full body on demand so the queue list stays light. */
function PreviewBody({ id }) {
    const { data, loading, error, refetch } = useApi(() => adminApi.post(id), [id]);

    if (loading) return <div className="px-5 pb-5"><LoadingState label="Loading the story…" /></div>;
    if (error) return <div className="px-5 pb-5"><ErrorState error={error} onRetry={refetch} /></div>;

    return (
        <div className="px-5 pb-6 pt-2 border-t border-border dark:border-border-dark bg-surface-alt/40 dark:bg-surface-dark/40">
            <div
                className="prose max-w-none text-sm text-gray-900 dark:text-white"
                dangerouslySetInnerHTML={{ __html: data?.content || '<p>No body text was supplied by the feed.</p>' }}
            />
        </div>
    );
}

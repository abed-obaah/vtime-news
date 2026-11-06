import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    CheckCircle, Eye, FileText, Pencil, Plus, RotateCcw, Search, Trash2, XCircle,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatNumber, formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const STATUS_TABS = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'draft', label: 'Drafts' },
    { id: 'published', label: 'Published' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'archived', label: 'Archived' },
];

const STATUS_COLORS = {
    published: 'bg-success/10 text-success',
    draft: 'bg-info/10 text-info',
    pending: 'bg-accent/10 text-accent',
    rejected: 'bg-danger/10 text-danger',
    archived: 'bg-surface-alt dark:bg-surface-dark text-text-muted',
};

export default function AdminPosts() {
    const [searchParams, setSearchParams] = useSearchParams();

    const status = searchParams.get('status') || 'all';
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [debounced, setDebounced] = useState(search);
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    // Debounce the search box so we aren't querying on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(search);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const query = useApi(
        () => adminApi.posts({ status, q: debounced || undefined, per_page: 20, page }),
        [status, debounced, page]
    );

    const counts = useApi(() => adminApi.postCounts(), [], { initialData: null });

    const posts = query.data?.items ?? [];
    const meta = query.data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;

    const reload = async () => {
        await Promise.all([query.refetch(), counts.refetch()]);
    };

    const changeStatus = (next) => {
        setPage(1);
        const params = {};
        if (next !== 'all') params.status = next;
        if (search) params.q = search;
        setSearchParams(params, { replace: true });
    };

    const act = async (post, action) => {
        if (action === 'delete' && !window.confirm(`Delete “${post.title}”? This can't be undone from the panel.`)) {
            return;
        }

        setBusyId(post.id);
        setNotice(null);

        try {
            if (action === 'publish') await adminApi.publishPost(post.id);
            else if (action === 'reject') await adminApi.rejectPost(post.id);
            else if (action === 'unpublish') await adminApi.unpublishPost(post.id);
            else if (action === 'delete') await adminApi.deletePost(post.id);

            setNotice({ tone: 'success', text: `“${post.title}” updated.` });
            await reload();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Posts Manager
                    </h1>
                    {meta && (
                        <p className="text-text-muted text-sm mt-1">
                            {meta.total} stor{meta.total === 1 ? 'y' : 'ies'} in this view
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search posts..."
                            className="pl-9 pr-4 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
                        />
                    </div>
                    <Link
                        to="/onlyadmindashboard/posts/create"
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors whitespace-nowrap"
                    >
                        <Plus size={16} /> New Post
                    </Link>
                </div>
            </div>

            {/* Status tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {STATUS_TABS.map((tab) => {
                    const count = counts.data?.[tab.id];

                    return (
                        <button
                            key={tab.id}
                            onClick={() => changeStatus(tab.id)}
                            className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                                status === tab.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-surface-dark-alt border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary'
                            }`}
                        >
                            {tab.label}
                            {count !== undefined && (
                                <span className={`ml-2 text-xs ${status === tab.id ? 'text-white/70' : 'text-text-muted'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {query.error ? (
                <ErrorState error={query.error} onRetry={query.refetch} />
            ) : query.loading && posts.length === 0 ? (
                <LoadingState label="Loading posts…" />
            ) : posts.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No posts here"
                    message={
                        debounced
                            ? `Nothing matches “${debounced}” in this view.`
                            : 'Nothing with this status yet.'
                    }
                    action={
                        <Link
                            to="/onlyadmindashboard/posts/create"
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors"
                        >
                            <Plus size={15} /> Write a story
                        </Link>
                    }
                />
            ) : (
                <>
                    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-surface-alt dark:bg-surface-dark border-b border-border dark:border-border-dark">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Article</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Section</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Views</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-border-dark">
                                    {posts.map((post) => (
                                        <tr key={post.id} className="hover:bg-surface-alt/50 dark:hover:bg-surface-dark/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {post.image && (
                                                        <img src={post.image} alt="" loading="lazy" className="w-12 h-9 rounded-lg object-cover shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-text-primary dark:text-text-inverse line-clamp-2 max-w-xs">
                                                            {post.title}
                                                        </p>
                                                        {post.source === 'rss' && (
                                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                                via {post.sourceName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {post.categoryName ? (
                                                    <span
                                                        className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                                                        style={{ backgroundColor: `${post.categoryColor}20`, color: post.categoryColor }}
                                                    >
                                                        {post.categoryName}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-text-muted">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[post.status] || ''}`}>
                                                    {post.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-text-secondary dark:text-text-muted">
                                                {formatNumber(post.views)}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                                {formatRelativeDate(post.publishedAt || post.createdAt)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {busyId === post.id && <Spinner size={14} className="text-primary mr-1" />}

                                                    {post.status !== 'published' && (
                                                        <button
                                                            onClick={() => act(post, 'publish')}
                                                            disabled={busyId === post.id}
                                                            className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors cursor-pointer disabled:opacity-40"
                                                            title="Publish"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}

                                                    {post.status === 'published' && (
                                                        <button
                                                            onClick={() => act(post, 'unpublish')}
                                                            disabled={busyId === post.id}
                                                            className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors cursor-pointer disabled:opacity-40"
                                                            title="Move back to drafts"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}

                                                    {post.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => act(post, 'reject')}
                                                            disabled={busyId === post.id}
                                                            className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    )}

                                                    <Link
                                                        to={`/onlyadmindashboard/posts/${post.id}/edit`}
                                                        className="p-1.5 rounded-lg hover:bg-info/10 text-info transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={15} />
                                                    </Link>

                                                    {post.status === 'published' && (
                                                        <Link
                                                            to={`/article/${post.slug}`}
                                                            target="_blank"
                                                            className="p-1.5 rounded-lg hover:bg-info/10 text-info transition-colors"
                                                            title="View on the site"
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                    )}

                                                    <button
                                                        onClick={() => act(post, 'delete')}
                                                        disabled={busyId === post.id}
                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {lastPage > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || query.loading}
                                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-text-muted">
                                Page {page} of {lastPage}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                                disabled={page >= lastPage || query.loading}
                                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

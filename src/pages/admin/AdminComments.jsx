import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Flag, MessageSquare, Trash2, XCircle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';
import Tooltip from '@/components/ui/Tooltip';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'approved', label: 'Approved' },
    { id: 'flagged', label: 'Flagged' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
];

const STATUS_COLORS = {
    approved: 'bg-success/10 text-success',
    flagged: 'bg-accent/10 text-accent',
    pending: 'bg-info/10 text-info',
    rejected: 'bg-danger/10 text-danger',
};

export default function AdminComments() {
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const query = useApi(() => adminApi.comments({ status, per_page: 25, page }), [status, page]);
    const counts = useApi(() => adminApi.commentCounts(), [], { initialData: null });

    const comments = query.data?.items ?? [];
    const meta = query.data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;

    const reload = () => Promise.all([query.refetch(), counts.refetch()]);

    const act = async (comment, action) => {
        if (action === 'delete' && !window.confirm('Delete this comment and its replies?')) return;

        setBusyId(comment.id);
        setNotice(null);

        try {
            if (action === 'delete') await adminApi.deleteComment(comment.id);
            else await adminApi.updateComment(comment.id, action);

            setNotice({ tone: 'success', text: `Comment ${action === 'delete' ? 'deleted' : action}.` });
            await reload();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                    Comments Moderator
                </h1>
                {meta && <p className="text-text-muted text-sm mt-1">{meta.total} comments in this view</p>}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map((tab) => {
                    const count = counts.data?.[tab.id];

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setStatus(tab.id);
                                setPage(1);
                            }}
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
            ) : query.loading && comments.length === 0 ? (
                <LoadingState label="Loading comments…" />
            ) : comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Nothing to moderate" message="No comments with this status." />
            ) : (
                <>
                    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark divide-y divide-border dark:divide-border-dark">
                        {comments.map((c) => (
                            <div key={c.id} className="p-5 hover:bg-surface-alt/50 dark:hover:bg-surface-dark/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-text-primary dark:text-text-inverse">
                                                {c.userName}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.status] || ''}`}>
                                                {c.status}
                                            </span>
                                                            {c.reports > 0 && (
                                                <Tooltip label={`Reported ${c.reports} time${c.reports === 1 ? '' : 's'} by readers`}>
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                                                        <Flag size={10} /> {c.reports}
                                                    </span>
                                                </Tooltip>
                                            )}
                                            <span className="text-xs text-text-muted">{formatRelativeDate(c.createdAt)}</span>
                                            {c.parentId && (
                                                <Tooltip label="This is a reply to another comment">
                                                    <span className="text-[10px] text-text-muted">· reply</span>
                                                </Tooltip>
                                            )}
                                        </div>

                                        <p className="text-sm text-text-secondary dark:text-text-muted break-words whitespace-pre-line">
                                            {c.content}
                                        </p>

                                        {c.postSlug && (
                                            <Link
                                                to={`/article/${c.postSlug}#comments`}
                                                target="_blank"
                                                className="inline-block text-xs text-primary hover:underline mt-2 truncate max-w-full"
                                            >
                                                on “{c.postTitle}”
                                            </Link>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {busyId === c.id && <Spinner size={14} className="text-primary mr-1" />}

                                        {c.status !== 'approved' && (
                                            <Tooltip label="Approve">
                                                <button
                                                    onClick={() => act(c, 'approved')}
                                                    disabled={busyId === c.id}
                                                    aria-label="Approve"
                                                    className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors cursor-pointer disabled:opacity-40"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            </Tooltip>
                                        )}
                                        {c.status !== 'flagged' && (
                                            <Tooltip label="Flag for review">
                                                <button
                                                    onClick={() => act(c, 'flagged')}
                                                    disabled={busyId === c.id}
                                                    aria-label="Flag for review"
                                                    className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors cursor-pointer disabled:opacity-40"
                                                >
                                                    <Flag size={16} />
                                                </button>
                                            </Tooltip>
                                        )}
                                        {c.status !== 'rejected' && (
                                            <Tooltip label="Hide from the site">
                                                <button
                                                    onClick={() => act(c, 'rejected')}
                                                    disabled={busyId === c.id}
                                                    aria-label="Hide from the site"
                                                    className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </Tooltip>
                                        )}
                                        <Tooltip label="Delete">
                                            <button
                                                onClick={() => act(c, 'delete')}
                                                disabled={busyId === c.id}
                                                aria-label="Delete"
                                                className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                            <span className="text-sm text-text-muted">Page {page} of {lastPage}</span>
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

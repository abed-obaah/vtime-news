import { useState } from 'react';
import { Bug, CheckCircle, Lightbulb, MessageCircle, MessageSquare, Send, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'resolved', label: 'Resolved' },
];

const TYPE_ICONS = { bug: Bug, suggestion: Lightbulb, feedback: MessageSquare };
const TYPE_COLORS = {
    bug: 'text-danger bg-danger/10',
    suggestion: 'text-accent bg-accent/10',
    feedback: 'text-info bg-info/10',
};

export default function AdminFeedback() {
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [replyId, setReplyId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const query = useApi(() => adminApi.feedback({ status, per_page: 25, page }), [status, page]);

    const items = query.data?.items ?? [];
    const meta = query.data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;

    const sendReply = async (item) => {
        const text = replyText.trim();

        if (text.length < 2) {
            setNotice({ tone: 'error', text: 'Write a response first.' });
            return;
        }

        setBusyId(item.id);
        setNotice(null);

        try {
            await adminApi.replyFeedback(item.id, text);
            setReplyId(null);
            setReplyText('');
            setNotice({ tone: 'success', text: 'Response saved and the item marked resolved.' });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That reply could not be saved.' });
        } finally {
            setBusyId(null);
        }
    };

    const act = async (item, action) => {
        if (action === 'delete' && !window.confirm('Delete this message?')) return;

        setBusyId(item.id);
        setNotice(null);

        try {
            if (action === 'resolve') await adminApi.resolveFeedback(item.id);
            else await adminApi.deleteFeedback(item.id);

            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Feedback</h1>
                {meta && <p className="text-text-muted text-sm mt-1">{meta.total} messages from readers</p>}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map((tab) => (
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
                    </button>
                ))}
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {query.error ? (
                <ErrorState error={query.error} onRetry={query.refetch} />
            ) : query.loading && items.length === 0 ? (
                <LoadingState label="Loading feedback…" />
            ) : items.length === 0 ? (
                <EmptyState icon={MessageCircle} title="No feedback here" message="Messages from the contact form land in this inbox." />
            ) : (
                <>
                    <div className="space-y-4">
                        {items.map((f) => {
                            const Icon = TYPE_ICONS[f.type] || MessageCircle;

                            return (
                                <div key={f.id} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[f.type]}`}>
                                                    <Icon size={12} /> {f.type}
                                                </span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
                                                    {f.status}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-sm text-text-primary dark:text-text-inverse mb-1">{f.subject}</h3>
                                            <p className="text-sm text-text-muted break-words whitespace-pre-line">{f.message}</p>

                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
                                                {f.name && <span>{f.name}</span>}
                                                <a href={`mailto:${f.user}`} className="hover:text-primary transition-colors">{f.user}</a>
                                                <span>·</span>
                                                <span>{formatRelativeDate(f.createdAt)}</span>
                                            </div>

                                            {f.adminReply && (
                                                <div className="mt-3 p-3 bg-surface-alt dark:bg-surface-dark rounded-lg border-l-2 border-primary">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                                                        Newsroom response · {formatRelativeDate(f.repliedAt)}
                                                    </p>
                                                    <p className="text-sm text-text-secondary dark:text-text-muted whitespace-pre-line">{f.adminReply}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {busyId === f.id && <Spinner size={14} className="text-primary mr-1" />}
                                            <button
                                                onClick={() => {
                                                    setReplyId(replyId === f.id ? null : f.id);
                                                    setReplyText('');
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-info/10 text-info transition-colors cursor-pointer"
                                                title="Reply"
                                            >
                                                <Send size={14} />
                                            </button>
                                            {f.status !== 'resolved' && (
                                                <button
                                                    onClick={() => act(f, 'resolve')}
                                                    disabled={busyId === f.id}
                                                    className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors cursor-pointer disabled:opacity-40"
                                                    title="Mark resolved"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => act(f, 'delete')}
                                                disabled={busyId === f.id}
                                                className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {replyId === f.id && (
                                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Type your response…"
                                                rows={2}
                                                maxLength={2000}
                                                className="flex-1 px-3 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                            />
                                            <button
                                                onClick={() => sendReply(f)}
                                                disabled={busyId === f.id}
                                                className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5 h-fit"
                                            >
                                                {busyId === f.id ? <Spinner size={13} /> : <Send size={13} />} Send
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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

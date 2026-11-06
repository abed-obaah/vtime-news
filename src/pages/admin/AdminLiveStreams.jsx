import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Radio, Square, Trash2, Users } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatDateTime, formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const TABS = [
    { id: 'live', label: 'Live now' },
    { id: 'ended', label: 'Ended' },
    { id: 'all', label: 'All' },
];

/** Moderation desk for the "go live" feature: force-end a broadcast, or clear old history. */
export default function AdminLiveStreams() {
    const [tab, setTab] = useState('live');
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const query = useApi(() => adminApi.liveStreams({ status: tab, per_page: 50 }), [tab]);
    const streams = query.data?.items ?? [];

    // The sidebar badge and this list can otherwise drift while a stream is live.
    useEffect(() => {
        const id = setInterval(query.refetch, 15000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const endStream = async (stream) => {
        if (!window.confirm(`End “${stream.title}” by ${stream.host.name}?`)) return;

        setBusyId(stream.id);
        setNotice(null);

        try {
            await adminApi.endLiveStream(stream.roomName);
            setNotice({ tone: 'success', text: 'Broadcast ended.' });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not end that broadcast.' });
        } finally {
            setBusyId(null);
        }
    };

    const deleteStream = async (stream) => {
        if (!window.confirm(`Permanently remove “${stream.title}” from the history?`)) return;

        setBusyId(stream.id);
        setNotice(null);

        try {
            await adminApi.deleteLiveStream(stream.roomName);
            setNotice({ tone: 'success', text: 'Removed.' });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not remove that record.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Live Broadcasts</h1>
                <p className="text-text-muted text-sm mt-1">Moderate reader- and staff-hosted live streams.</p>
            </div>

            <div className="flex gap-1 mb-6 bg-surface-alt dark:bg-surface-dark-alt rounded-xl p-1 border border-border dark:border-border-dark w-fit">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            tab === t.id
                                ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-primary dark:hover:text-text-inverse'
                        }`}
                    >
                        {t.label}
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
            ) : query.loading && streams.length === 0 ? (
                <LoadingState label="Loading broadcasts…" />
            ) : streams.length === 0 ? (
                <EmptyState icon={Radio} title="Nothing here" message="No broadcasts match this filter." />
            ) : (
                <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border dark:border-border-dark text-left text-text-muted text-xs uppercase tracking-wide">
                                    <th className="px-4 py-3 font-semibold">Broadcast</th>
                                    <th className="px-4 py-3 font-semibold">Host</th>
                                    <th className="px-4 py-3 font-semibold">Started</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {streams.map((stream) => (
                                    <tr key={stream.id} className="border-b border-border dark:border-border-dark last:border-0">
                                        <td className="px-4 py-3 max-w-xs">
                                            <p className="font-semibold text-text-primary dark:text-text-inverse truncate">{stream.title}</p>
                                            {stream.category && (
                                                <span className="text-[10px] font-semibold uppercase text-text-muted">{stream.category.name}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary dark:text-text-muted">{stream.host.name}</td>
                                        <td className="px-4 py-3 text-text-secondary dark:text-text-muted whitespace-nowrap">
                                            {formatDateTime(stream.startedAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {stream.status === 'live' ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-danger/10 text-danger">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" /> Live
                                                    <span className="inline-flex items-center gap-0.5 font-semibold normal-case ml-1">
                                                        <Users size={10} /> {stream.viewerCount}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-surface-alt dark:bg-surface-dark text-text-muted">
                                                    Ended {stream.endReason === 'admin_ended' ? '· by admin' : stream.endReason === 'disconnected' ? '· disconnected' : ''}
                                                    {' '}{formatRelativeDate(stream.endedAt)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {stream.status === 'live' && (
                                                    <Link
                                                        to={`/live/${stream.roomName}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg hover:bg-surface-alt dark:hover:bg-surface-dark text-text-muted transition-colors"
                                                        title="Watch"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>
                                                )}
                                                {stream.status === 'live' ? (
                                                    <button
                                                        onClick={() => endStream(stream)}
                                                        disabled={busyId === stream.id}
                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                                        title="Force-end this broadcast"
                                                    >
                                                        {busyId === stream.id ? <Spinner size={14} /> : <Square size={14} />}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => deleteStream(stream)}
                                                        disabled={busyId === stream.id}
                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                                        title="Delete record"
                                                    >
                                                        {busyId === stream.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

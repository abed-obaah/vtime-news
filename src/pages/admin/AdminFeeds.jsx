import { useState } from 'react';
import {
    AlertTriangle, CheckCircle2, Download, Plus, Rss, ToggleLeft, ToggleRight, Trash2, X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const EMPTY_FORM = {
    name: '',
    url: '',
    website: '',
    category_id: '',
    fetch_interval_minutes: 60,
    auto_publish: false,
};

/**
 * Where the wire comes from: add, pause, and pull the RSS/Atom sources that
 * feed the moderation queue.
 */
export default function AdminFeeds() {
    const feeds = useApi(() => adminApi.feeds(), [], { initialData: [] });
    const { data: categories } = useApi(() => adminApi.categories(), [], { initialData: [] });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [fetchingAll, setFetchingAll] = useState(false);
    const [notice, setNotice] = useState(null);

    const list = feeds.data || [];

    const set = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setShowForm(false);
    };

    const addFeed = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotice(null);

        try {
            await adminApi.createFeed({
                name: form.name.trim(),
                url: form.url.trim(),
                website: form.website.trim() || undefined,
                category_id: form.category_id ? Number(form.category_id) : null,
                fetch_interval_minutes: Number(form.fetch_interval_minutes) || 60,
                auto_publish: form.auto_publish,
            });

            resetForm();
            setNotice({ tone: 'success', text: 'Feed added. Pull it now to fill the queue.' });
            await feeds.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That feed could not be added.' });
        } finally {
            setSaving(false);
        }
    };

    const act = async (feed, action) => {
        if (action === 'delete' && !window.confirm(`Remove “${feed.name}”? Stories already imported are kept.`)) {
            return;
        }

        setBusyId(feed.id);
        setNotice(null);

        try {
            if (action === 'toggle') {
                await adminApi.toggleFeed(feed.id);
            } else if (action === 'fetch') {
                const result = await adminApi.fetchFeed(feed.id);
                setNotice({ tone: 'success', text: `${feed.name}: ${result.message}` });
            } else if (action === 'delete') {
                await adminApi.deleteFeed(feed.id);
                setNotice({ tone: 'success', text: `${feed.name} removed.` });
            }

            await feeds.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    const toggleAutoPublish = async (feed) => {
        setBusyId(feed.id);
        try {
            await adminApi.updateFeed(feed.id, { auto_publish: !feed.autoPublish });
            await feeds.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not change that setting.' });
        } finally {
            setBusyId(null);
        }
    };

    const fetchAll = async () => {
        setFetchingAll(true);
        setNotice(null);

        try {
            const result = await adminApi.fetchAllFeeds();
            setNotice({ tone: 'success', text: result.message });
            await feeds.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Could not reach the feeds.' });
        } finally {
            setFetchingAll(false);
        }
    };

    const inputClass =
        'w-full px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        RSS Feeds
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Wire sources that fill the moderation queue. Nothing they bring in goes live until an editor
                        publishes it — unless a feed is set to auto-publish.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAll}
                        disabled={fetchingAll || list.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                        {fetchingAll ? <Spinner size={16} /> : <Download size={16} />}
                        {fetchingAll ? 'Fetching…' : 'Fetch all now'}
                    </button>
                    <button
                        onClick={() => setShowForm((s) => !s)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer whitespace-nowrap"
                    >
                        {showForm ? <X size={16} /> : <Plus size={16} />}
                        {showForm ? 'Cancel' : 'Add Feed'}
                    </button>
                </div>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {showForm && (
                <form
                    onSubmit={addFeed}
                    className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 mb-6 space-y-4"
                >
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverse">New feed source</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Name</label>
                            <input type="text" value={form.name} onChange={set('name')} required minLength={2} maxLength={120} placeholder="Reuters — World" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Feed URL</label>
                            <input type="url" value={form.url} onChange={set('url')} required placeholder="https://example.com/rss.xml" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Website (optional)</label>
                            <input type="url" value={form.website} onChange={set('website')} placeholder="https://example.com" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Assign to section</label>
                            <select value={form.category_id} onChange={set('category_id')} className={`${inputClass} cursor-pointer`}>
                                <option value="">Guess from the feed</option>
                                {(categories || []).map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Check every (minutes)</label>
                            <input type="number" min={5} max={1440} value={form.fetch_interval_minutes} onChange={set('fetch_interval_minutes')} className={inputClass} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-muted cursor-pointer sm:mt-6">
                            <input type="checkbox" checked={form.auto_publish} onChange={set('auto_publish')} className="w-4 h-4 accent-primary cursor-pointer" />
                            Auto-publish (skip moderation)
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                        >
                            {saving && <Spinner size={14} />} Add feed
                        </button>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-5 py-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-text-inverse transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {feeds.error ? (
                <ErrorState error={feeds.error} onRetry={feeds.refetch} />
            ) : feeds.loading && list.length === 0 ? (
                <LoadingState label="Loading feeds…" />
            ) : list.length === 0 ? (
                <EmptyState
                    icon={Rss}
                    title="No feeds configured"
                    message="Add an RSS or Atom URL and Vtime News will start pulling stories into the moderation queue."
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {list.map((feed) => (
                        <div
                            key={feed.id}
                            className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Rss size={15} className="text-primary shrink-0" />
                                        <h3 className="font-bold text-sm text-text-primary dark:text-text-inverse truncate">
                                            {feed.name}
                                        </h3>
                                        {feed.lastStatus === 'ok' && <CheckCircle2 size={14} className="text-success shrink-0" />}
                                        {feed.lastStatus === 'failed' && <AlertTriangle size={14} className="text-danger shrink-0" />}
                                    </div>
                                    <a
                                        href={feed.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-text-muted hover:text-primary transition-colors break-all"
                                    >
                                        {feed.url}
                                    </a>
                                </div>

                                <button
                                    onClick={() => act(feed, 'toggle')}
                                    disabled={busyId === feed.id}
                                    className={`shrink-0 cursor-pointer disabled:opacity-50 ${feed.isActive ? 'text-success' : 'text-text-muted'}`}
                                    title={feed.isActive ? 'Pause this feed' : 'Resume this feed'}
                                >
                                    {feed.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
                                <span className="px-2 py-0.5 rounded-full bg-surface-alt dark:bg-surface-dark text-text-muted">
                                    {feed.categoryName || 'Auto section'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-surface-alt dark:bg-surface-dark text-text-muted">
                                    every {feed.fetchIntervalMinutes} min
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-info/10 text-info">
                                    {feed.postsCount ?? 0} imported
                                </span>
                                {feed.autoPublish && (
                                    <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                                        auto-publish
                                    </span>
                                )}
                            </div>

                            <p className="text-[11px] text-text-muted mb-1">
                                {feed.lastFetchedAt ? `Last checked ${formatRelativeDate(feed.lastFetchedAt)}` : 'Never fetched'}
                            </p>
                            {feed.lastStatus === 'failed' && feed.lastError && (
                                <p className="text-[11px] text-danger mb-2 line-clamp-2">{feed.lastError}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border dark:border-border-dark">
                                <button
                                    onClick={() => act(feed, 'fetch')}
                                    disabled={busyId === feed.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {busyId === feed.id ? <Spinner size={13} /> : <Download size={13} />} Fetch now
                                </button>
                                <button
                                    onClick={() => toggleAutoPublish(feed)}
                                    disabled={busyId === feed.id}
                                    className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-accent transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {feed.autoPublish ? 'Require review' : 'Auto-publish'}
                                </button>
                                <button
                                    onClick={() => act(feed, 'delete')}
                                    disabled={busyId === feed.id}
                                    className="ml-auto p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                    title="Remove feed"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

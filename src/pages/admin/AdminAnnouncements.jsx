import { useState } from 'react';
import { Megaphone, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const EMPTY = { title: '', message: '', type: 'info' };

export default function AdminAnnouncements() {
    const announcements = useApi(() => adminApi.announcements(), [], { initialData: [] });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const list = announcements.data || [];

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const add = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotice(null);

        try {
            await adminApi.createAnnouncement({
                title: form.title.trim(),
                message: form.message.trim(),
                type: form.type,
            });

            setForm(EMPTY);
            setShowForm(false);
            setNotice({ tone: 'success', text: 'Announcement published.' });
            await announcements.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That announcement could not be published.' });
        } finally {
            setSaving(false);
        }
    };

    const act = async (item, action) => {
        if (action === 'delete' && !window.confirm(`Delete “${item.title}”?`)) return;

        setBusyId(item.id);
        setNotice(null);

        try {
            if (action === 'toggle') await adminApi.toggleAnnouncement(item.id);
            else await adminApi.deleteAnnouncement(item.id);

            await announcements.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That action failed.' });
        } finally {
            setBusyId(null);
        }
    };

    const inputClass =
        'w-full px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Announcements</h1>
                    <p className="text-text-muted text-sm mt-1">Site-wide notices for readers.</p>
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'New Announcement'}
                </button>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {showForm && (
                <form onSubmit={add} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 mb-6 space-y-4">
                    <input type="text" value={form.title} onChange={set('title')} required minLength={2} maxLength={160} placeholder="Announcement title" className={inputClass} />
                    <textarea value={form.message} onChange={set('message')} required minLength={2} maxLength={1000} placeholder="Message…" rows={3} className={`${inputClass} resize-none`} />
                    <select value={form.type} onChange={set('type')} className={`${inputClass} sm:w-48 cursor-pointer`}>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="urgent">Urgent</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                        >
                            {saving && <Spinner size={14} />} Publish
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-5 py-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-text-inverse transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {announcements.error ? (
                <ErrorState error={announcements.error} onRetry={announcements.refetch} />
            ) : announcements.loading && list.length === 0 ? (
                <LoadingState label="Loading announcements…" />
            ) : list.length === 0 ? (
                <EmptyState icon={Megaphone} title="No announcements" message="Publish a notice to show it across the site." />
            ) : (
                <div className="space-y-4">
                    {list.map((a) => (
                        <div
                            key={a.id}
                            className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 flex items-start justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <Megaphone size={16} className="text-primary shrink-0" />
                                    <h3 className="font-bold text-sm text-text-primary dark:text-text-inverse">{a.title}</h3>
                                    <span
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                                            a.type === 'urgent'
                                                ? 'bg-danger/10 text-danger'
                                                : a.type === 'warning'
                                                  ? 'bg-accent/10 text-accent'
                                                  : 'bg-info/10 text-info'
                                        }`}
                                    >
                                        {a.type}
                                    </span>
                                    {!a.active && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-alt dark:bg-surface-dark text-text-muted uppercase">
                                            hidden
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-text-muted break-words">{a.message}</p>
                                <p className="text-[10px] text-text-muted mt-1">{formatRelativeDate(a.createdAt)}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => act(a, 'toggle')}
                                    disabled={busyId === a.id}
                                    className={`cursor-pointer disabled:opacity-50 ${a.active ? 'text-success' : 'text-text-muted'}`}
                                    title={a.active ? 'Hide' : 'Show'}
                                >
                                    {a.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                </button>
                                <button
                                    onClick={() => act(a, 'delete')}
                                    disabled={busyId === a.id}
                                    className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                    title="Delete"
                                >
                                    {busyId === a.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

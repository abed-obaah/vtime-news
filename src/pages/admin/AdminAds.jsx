import { useState } from 'react';
import { MonitorPlay, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatNumber } from '@/utils/helpers';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const PLACEMENTS = {
    sidebar: 'Sidebar',
    'header-banner': 'Header Banner',
    inline: 'Inline (Article)',
    'before-footer': 'Before Footer',
    popup: 'Pop-up',
    popunder: 'Pop-under',
};

const SOURCES = {
    custom: 'Custom card',
    network: 'Ad network (AdSense, etc.)',
};

const NETWORK_PRESETS = ['Google AdSense', 'Media.net', 'PropellerAds', 'Ezoic', 'Other'];

const EMPTY = {
    title: '',
    description: '',
    image: '',
    link: '',
    placement: 'sidebar',
    priority: 0,
    source: 'custom',
    networkName: '',
    code: '',
};

export default function AdminAds() {
    const ads = useApi(() => adminApi.ads(), [], { initialData: [] });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const list = ads.data || [];

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const openCreate = () => {
        setForm(EMPTY);
        setEditingId(null);
        setShowForm(true);
    };

    const openEdit = (ad) => {
        setForm({
            title: ad.title || '',
            description: ad.description || '',
            image: ad.image || '',
            link: ad.link || '',
            placement: ad.placement,
            priority: ad.priority ?? 0,
            source: ad.source || 'custom',
            networkName: ad.networkName || '',
            code: ad.code || '',
        });
        setEditingId(ad.id);
        setShowForm(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotice(null);

        const isNetwork = form.source === 'network';

        const payload = isNetwork
            ? {
                  title: form.title.trim(),
                  source: 'network',
                  network_name: form.networkName.trim() || null,
                  code: form.code.trim(),
                  placement: form.placement,
                  priority: Number(form.priority) || 0,
                  description: null,
                  image: null,
                  link: null,
              }
            : {
                  title: form.title.trim(),
                  source: 'custom',
                  network_name: null,
                  code: null,
                  description: form.description.trim() || null,
                  image: form.image.trim() || null,
                  link: form.link.trim() || '#',
                  placement: form.placement,
                  priority: Number(form.priority) || 0,
              };

        try {
            if (editingId) await adminApi.updateAd(editingId, payload);
            else await adminApi.createAd(payload);

            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY);
            setNotice({ tone: 'success', text: editingId ? 'Ad updated.' : 'Ad created.' });
            await ads.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That ad could not be saved.' });
        } finally {
            setSaving(false);
        }
    };

    const act = async (ad, action) => {
        if (action === 'delete' && !window.confirm(`Delete “${ad.title}”?`)) return;

        setBusyId(ad.id);
        setNotice(null);

        try {
            if (action === 'toggle') await adminApi.toggleAd(ad.id);
            else await adminApi.deleteAd(ad.id);

            await ads.refetch();
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
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Ads Manager</h1>
                    <p className="text-text-muted text-sm mt-1">{list.length} campaigns</p>
                </div>
                <button
                    onClick={showForm ? () => setShowForm(false) : openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'Add Ad'}
                </button>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {showForm && (
                <form onSubmit={submit} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 mb-6 space-y-4">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverse">
                        {editingId ? 'Edit ad' : 'New ad'}
                    </h3>

                    <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5">Ad source</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(SOURCES).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, source: value }))}
                                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl border text-left transition-colors cursor-pointer ${
                                        form.source === value
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {form.source === 'network' && (
                            <p className="text-xs text-text-muted mt-2">
                                Paste the ad unit code the network gave you (Google AdSense, Media.net, or any other
                                promoter). It&rsquo;s embedded on the page exactly as pasted, so only paste code from a
                                network you trust.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">
                                {form.source === 'network' ? 'Label (for your reference only)' : 'Title'}
                            </label>
                            <input type="text" value={form.title} onChange={set('title')} required minLength={2} maxLength={160} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-muted mb-1.5">Placement</label>
                            <select value={form.placement} onChange={set('placement')} className={`${inputClass} cursor-pointer`}>
                                {Object.entries(PLACEMENTS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            {form.placement === 'popunder' && (
                                <p className="text-xs text-text-muted mt-1.5">
                                    {form.source === 'network'
                                        ? "The network's own snippet is injected once and handles its own trigger."
                                        : 'Opens the click-through link behind the page on the reader’s first click. Fires once per browser tab.'}
                                </p>
                            )}
                        </div>

                        {form.source === 'network' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Network</label>
                                    <input
                                        type="text"
                                        list="ad-network-presets"
                                        value={form.networkName}
                                        onChange={set('networkName')}
                                        placeholder="Google AdSense"
                                        className={inputClass}
                                    />
                                    <datalist id="ad-network-presets">
                                        {NETWORK_PRESETS.map((n) => <option key={n} value={n} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Priority (higher shows first)</label>
                                    <input type="number" min={0} max={999} value={form.priority} onChange={set('priority')} className={inputClass} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Ad code</label>
                                    <textarea
                                        value={form.code}
                                        onChange={set('code')}
                                        required
                                        rows={6}
                                        placeholder={'<ins class="adsbygoogle" ...></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'}
                                        spellCheck={false}
                                        className={`${inputClass} font-mono text-xs`}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Description</label>
                                    <input type="text" value={form.description} onChange={set('description')} maxLength={500} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Image URL</label>
                                    <input type="url" value={form.image} onChange={set('image')} placeholder="https://…" className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Click-through link</label>
                                    <input type="text" value={form.link} onChange={set('link')} placeholder="https://…" className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Priority (higher shows first)</label>
                                    <input type="number" min={0} max={999} value={form.priority} onChange={set('priority')} className={inputClass} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                        >
                            {saving && <Spinner size={14} />} {editingId ? 'Save changes' : 'Create ad'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditingId(null);
                            }}
                            className="px-5 py-2 text-sm text-text-muted hover:text-text-primary dark:hover:text-text-inverse transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {ads.error ? (
                <ErrorState error={ads.error} onRetry={ads.refetch} />
            ) : ads.loading && list.length === 0 ? (
                <LoadingState label="Loading ads…" />
            ) : list.length === 0 ? (
                <EmptyState icon={MonitorPlay} title="No ads yet" message="Create a campaign to fill the ad slots across the site." />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {list.map((ad) => {
                            const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';

                            return (
                                <div key={ad.id} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden">
                                    {ad.source === 'network'
                                        ? (
                                            <div className="h-10 flex items-center px-5 bg-info/5 border-b border-border dark:border-border-dark">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-info">
                                                    {ad.networkName || 'Ad network'}
                                                </span>
                                            </div>
                                        )
                                        : ad.image && <img src={ad.image} alt={ad.title} loading="lazy" className="w-full h-36 object-cover" />}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-text-primary dark:text-text-inverse text-sm truncate">{ad.title}</h3>
                                                <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                                                    {ad.source === 'network' ? 'Renders an embedded network ad unit.' : ad.description}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => act(ad, 'toggle')}
                                                disabled={busyId === ad.id}
                                                className={`shrink-0 cursor-pointer disabled:opacity-50 ${ad.active ? 'text-success' : 'text-text-muted'}`}
                                                title={ad.active ? 'Pause' : 'Activate'}
                                            >
                                                {ad.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-3 text-[11px] text-text-muted mt-3">
                                            <span>{formatNumber(ad.impressions)} views</span>
                                            <span>{formatNumber(ad.clicks)} clicks</span>
                                            <span>{ctr}% CTR</span>
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-xs font-medium px-2.5 py-1 bg-info/10 text-info rounded-full">
                                                {PLACEMENTS[ad.placement] || ad.placement}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openEdit(ad)}
                                                    className="p-1.5 rounded-lg hover:bg-info/10 text-info transition-colors cursor-pointer"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => act(ad, 'delete')}
                                                    disabled={busyId === ad.id}
                                                    className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                                    title="Delete"
                                                >
                                                    {busyId === ad.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6">
                        <h3 className="font-bold text-text-primary dark:text-text-inverse mb-4">Placement coverage</h3>
                        <div className="space-y-3">
                            {Object.entries(PLACEMENTS).map(([key, label]) => {
                                const filled = list.some((a) => a.placement === key && a.active);

                                return (
                                    <div key={key} className="flex items-center justify-between py-2 border-b border-border dark:border-border-dark last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary dark:text-text-inverse">{label}</p>
                                            <p className="text-xs text-text-muted font-mono">{key}</p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${filled ? 'bg-success/10 text-success' : 'bg-surface-alt dark:bg-surface-dark text-text-muted'}`}>
                                            {filled ? 'Live' : 'No ad'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

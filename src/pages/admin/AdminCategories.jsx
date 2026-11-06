import { useState } from 'react';
import { Check, FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const EMPTY = { name: '', slug: '', color: '#3B82F6', description: '' };

export default function AdminCategories() {
    const categories = useApi(() => adminApi.categories(), [], { initialData: [] });

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY);
    const [busyId, setBusyId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null);

    const list = categories.data || [];

    const set = (setter) => (field) => (e) => setter((f) => ({ ...f, [field]: e.target.value }));
    const setNew = set(setForm);
    const setEdit = set(setEditForm);

    const add = async (e) => {
        e.preventDefault();
        setSaving(true);
        setNotice(null);

        try {
            await adminApi.createCategory({
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
                color: form.color,
                description: form.description.trim() || undefined,
            });

            setForm(EMPTY);
            setShowForm(false);
            setNotice({ tone: 'success', text: 'Category added.' });
            await categories.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That category could not be added.' });
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditForm({
            name: cat.name,
            slug: cat.slug,
            color: cat.color || '#3B82F6',
            description: cat.description || '',
        });
    };

    const saveEdit = async (cat) => {
        setBusyId(cat.id);
        setNotice(null);

        try {
            await adminApi.updateCategory(cat.id, {
                name: editForm.name.trim(),
                slug: editForm.slug.trim() || undefined,
                color: editForm.color,
                description: editForm.description.trim() || null,
            });

            setEditingId(null);
            setNotice({ tone: 'success', text: 'Category updated.' });
            await categories.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That change could not be saved.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (cat) => {
        if (!window.confirm(`Delete “${cat.name}”? Its ${cat.postsCount ?? 0} stories stay, but lose their section.`)) {
            return;
        }

        setBusyId(cat.id);
        setNotice(null);

        try {
            await adminApi.deleteCategory(cat.id);
            setNotice({ tone: 'success', text: `${cat.name} deleted.` });
            await categories.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That category could not be deleted.' });
        } finally {
            setBusyId(null);
        }
    };

    const inputClass =
        'px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Categories Manager
                    </h1>
                    <p className="text-text-muted text-sm mt-1">{list.length} sections</p>
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors cursor-pointer"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'Add Category'}
                </button>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {showForm && (
                <form onSubmit={add} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 mb-6">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverse mb-4">New Category</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <input type="text" value={form.name} onChange={setNew('name')} required minLength={2} maxLength={80} placeholder="Category name" className={inputClass} />
                        <input type="text" value={form.slug} onChange={setNew('slug')} maxLength={80} placeholder="URL slug (auto-generated)" className={inputClass} />
                        <input type="text" value={form.description} onChange={setNew('description')} maxLength={300} placeholder="Description" className={inputClass} />
                        <div className="flex items-center gap-2">
                            <input type="color" value={form.color} onChange={setNew('color')} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                            <span className="text-sm text-text-muted">Colour: {form.color}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                        >
                            {saving && <Spinner size={14} />} Add
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

            {categories.error ? (
                <ErrorState error={categories.error} onRetry={categories.refetch} />
            ) : categories.loading && list.length === 0 ? (
                <LoadingState label="Loading categories…" />
            ) : list.length === 0 ? (
                <EmptyState icon={FolderOpen} title="No categories yet" message="Add your first section to start organising stories." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((cat) => (
                        <div
                            key={cat.id}
                            className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 hover:shadow-md transition-shadow"
                        >
                            {editingId === cat.id ? (
                                <div className="space-y-3">
                                    <input type="text" value={editForm.name} onChange={setEdit('name')} className={`${inputClass} w-full`} />
                                    <input type="text" value={editForm.slug} onChange={setEdit('slug')} className={`${inputClass} w-full`} />
                                    <input type="text" value={editForm.description} onChange={setEdit('description')} placeholder="Description" className={`${inputClass} w-full`} />
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={editForm.color} onChange={setEdit('color')} className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent" />
                                        <span className="text-xs text-text-muted">{editForm.color}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => saveEdit(cat)}
                                            disabled={busyId === cat.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer"
                                        >
                                            {busyId === cat.id ? <Spinner size={12} /> : <Check size={13} />} Save
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary dark:hover:text-text-inverse cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                            <h3 className="font-bold text-text-primary dark:text-text-inverse truncate">{cat.name}</h3>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => startEdit(cat)}
                                                className="p-1.5 rounded-lg hover:bg-info/10 text-info transition-colors cursor-pointer"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => remove(cat)}
                                                disabled={busyId === cat.id}
                                                className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors disabled:opacity-50 cursor-pointer"
                                                title="Delete"
                                            >
                                                {busyId === cat.id ? <Spinner size={13} /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-text-muted mb-2 line-clamp-2 min-h-8">{cat.description || 'No description.'}</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-text-muted font-mono">/{cat.slug}</p>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-alt dark:bg-surface-dark text-text-muted">
                                            {cat.postsCount ?? 0} posts
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

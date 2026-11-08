import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, ExternalLink, FileText, Image as ImageIcon, Layout, Save, Send, Type, X,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { Notice, Spinner } from '@/components/ui/States';
import ImageUploadField from '@/components/ui/ImageUploadField';

const EMPTY = {
    title: '',
    excerpt: '',
    content: '',
    image: '',
    category_id: '',
    author: '',
    tags: [],
    is_featured: false,
    is_breaking: false,
};

/**
 * One editor for both "write a new story" and "proofread a wire story".
 *
 * @param {object|null} post   existing story (edit mode) or null (create mode)
 * @param {Function} onSubmit  ({ payload, status }) => void
 */
export default function PostForm({ post = null, onSubmit, submitting, error, notice, onDismissNotice }) {
    const { data: categories } = useApi(() => adminApi.categories(), [], { initialData: [] });

    const [form, setForm] = useState(EMPTY);
    const [tagInput, setTagInput] = useState('');
    const [loadedId, setLoadedId] = useState(null);

    // Fill the form once the story arrives (edit mode loads asynchronously).
    // Adjusting state during render is React's documented pattern for
    // resetting state when the component is handed different data.
    if (post && loadedId !== post.id) {
        setLoadedId(post.id);
        setForm({
            title: post.title || '',
            excerpt: post.excerpt || '',
            content: post.content || '',
            image: post.image || '',
            category_id: post.categoryId ? String(post.categoryId) : '',
            author: post.author || '',
            tags: post.tags || [],
            is_featured: Boolean(post.isFeatured),
            is_breaking: Boolean(post.isBreaking),
        });
    }

    const set = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();

        if (!tag || form.tags.includes(tag) || form.tags.length >= 12) {
            setTagInput('');
            return;
        }

        setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
        setTagInput('');
    };

    const removeTag = (tag) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

    const wordCount = useMemo(
        () => form.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length,
        [form.content]
    );
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const buildPayload = () => ({
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        content: form.content,
        image: form.image.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        author: form.author.trim() || undefined,
        tags: form.tags,
        is_featured: form.is_featured,
        is_breaking: form.is_breaking,
    });

    const submit = (status) => (e) => {
        e.preventDefault();
        onSubmit({ payload: buildPayload(), status });
    };

    const isEdit = Boolean(post);

    return (
        <form className="max-w-5xl mx-auto space-y-8 pb-20 p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-surface-dark-alt p-5 rounded-2xl border border-border dark:border-border-dark sticky top-0 z-20">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        to={isEdit ? '/onlyadmindashboard/moderation' : '/onlyadmindashboard/posts'}
                        className="p-2 hover:bg-surface-alt dark:hover:bg-surface-dark rounded-full transition-all shrink-0"
                        aria-label="Back"
                    >
                        <ArrowLeft size={22} className="text-text-secondary dark:text-text-muted" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-text-primary dark:text-text-inverse font-display truncate">
                            {isEdit ? 'Proofread & Edit' : 'New Story'}
                        </h1>
                        <p className="text-text-muted text-xs mt-0.5">
                            {isEdit
                                ? `${post.status === 'pending' ? 'Waiting for review' : `Status: ${post.status}`} · ${wordCount} words · ${readTime} min read`
                                : `${wordCount} words · ${readTime} min read`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={submit('draft')}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface-alt dark:bg-surface-dark text-text-secondary dark:text-text-muted font-bold uppercase text-xs hover:text-primary transition-all rounded-xl disabled:opacity-50 cursor-pointer"
                    >
                        {submitting ? <Spinner size={14} /> : <Save size={14} />}
                        Save Draft
                    </button>
                    {isEdit && post?.status === 'pending' && (
                        <button
                            type="button"
                            onClick={submit('rejected')}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-danger/10 text-danger font-bold uppercase text-xs hover:bg-danger/20 transition-all rounded-xl disabled:opacity-50 cursor-pointer"
                        >
                            <X size={14} /> Reject
                        </button>
                    )}
                    <button
                        type="submit"
                        onClick={submit('published')}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold uppercase text-xs cursor-pointer hover:bg-primary-dark transition-all rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {submitting ? <Spinner size={14} /> : <Send size={14} />}
                        {isEdit && post?.status === 'published' ? 'Update' : 'Publish'}
                    </button>
                </div>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={onDismissNotice}>
                    {notice.text}
                </Notice>
            )}
            {error && !notice && <Notice tone="error">{error.message}</Notice>}

            {isEdit && post?.source === 'rss' && post?.sourceUrl && (
                <Notice tone="info">
                    Imported from {post.sourceName || 'an RSS feed'}.{' '}
                    <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline inline-flex items-center gap-1">
                        Read the original <ExternalLink size={12} />
                    </a>
                </Notice>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-surface-dark-alt p-6 sm:p-8 rounded-3xl border border-border dark:border-border-dark space-y-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                <Type size={12} /> Headline
                            </label>
                            <input
                                type="text"
                                placeholder="Enter a powerful headline..."
                                value={form.title}
                                onChange={set('title')}
                                required
                                maxLength={480}
                                className="w-full text-2xl font-bold placeholder:text-text-muted/40 border-none focus:outline-none bg-transparent text-text-primary dark:text-text-inverse p-0"
                            />
                        </div>

                        <hr className="border-border dark:border-border-dark" />

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                <FileText size={12} /> Summary (Excerpt)
                            </label>
                            <textarea
                                placeholder="Briefly summarize the story… (leave blank and we'll take the opening lines)"
                                value={form.excerpt}
                                onChange={set('excerpt')}
                                maxLength={1000}
                                className="w-full text-base font-medium placeholder:text-text-muted/40 border-none focus:outline-none bg-transparent text-text-secondary dark:text-text-muted p-0 min-h-24 resize-y"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark-alt p-6 sm:p-8 rounded-3xl border border-border dark:border-border-dark space-y-4">
                        <label className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                            <span>Article Content (HTML supported)</span>
                            <span className="font-medium normal-case tracking-normal">{wordCount} words</span>
                        </label>
                        <textarea
                            placeholder="Tell the story here…"
                            value={form.content}
                            onChange={set('content')}
                            required
                            className="w-full text-sm leading-relaxed placeholder:text-text-muted/40 border-none focus:outline-none bg-transparent text-text-primary dark:text-text-inverse p-0 min-h-100 resize-y font-mono"
                        />
                        <p className="text-[11px] text-text-muted">
                            Scripts, iframes and event handlers are stripped on save.
                        </p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface-dark-alt p-6 rounded-3xl border border-border dark:border-border-dark space-y-4">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                            <Layout size={14} className="text-primary" /> Section
                        </h3>
                        <select
                            value={form.category_id}
                            onChange={set('category_id')}
                            className="w-full p-3 bg-surface-alt dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl text-sm text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                            <option value="">Uncategorised</option>
                            {(categories || []).map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Byline</label>
                            <input
                                type="text"
                                value={form.author}
                                onChange={set('author')}
                                placeholder="PulseNews"
                                maxLength={120}
                                className="w-full p-3 bg-surface-alt dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl text-sm text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-muted cursor-pointer">
                                <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} className="w-4 h-4 accent-primary cursor-pointer" />
                                Feature on the homepage
                            </label>
                            <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-muted cursor-pointer">
                                <input type="checkbox" checked={form.is_breaking} onChange={set('is_breaking')} className="w-4 h-4 accent-primary cursor-pointer" />
                                Mark as breaking news
                            </label>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark-alt p-6 rounded-3xl border border-border dark:border-border-dark space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Tags</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                placeholder="Add a tag…"
                                maxLength={60}
                                className="flex-1 min-w-0 p-2.5 bg-surface-alt dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl text-xs text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-3 py-2 text-xs font-bold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
                            >
                                Add
                            </button>
                        </div>
                        {form.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {form.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-primary/10 text-primary rounded-lg"
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-primary-dark cursor-pointer"
                                            aria-label={`Remove ${tag}`}
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-[11px] text-text-muted">Up to 12 tags.</p>
                    </div>

                    <div className="bg-white dark:bg-surface-dark-alt p-6 rounded-3xl border border-border dark:border-border-dark space-y-4">
                        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                            <ImageIcon size={14} className="text-primary" /> Lead Image
                        </h3>
                        <ImageUploadField
                            value={form.image}
                            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}

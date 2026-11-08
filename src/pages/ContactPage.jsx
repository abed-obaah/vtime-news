import { useState } from 'react';
import { Bug, Lightbulb, MessageSquare, Send } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Notice, Spinner } from '@/components/ui/States';
import { useSeo } from '@/hooks/useSeo';

const TYPES = [
    { id: 'feedback', label: 'General feedback', icon: MessageSquare },
    { id: 'bug', label: 'Report a problem', icon: Bug },
    { id: 'suggestion', label: 'Suggest something', icon: Lightbulb },
];

export default function ContactPage() {
    const { user, isAuthenticated } = useAuth();

    const [form, setForm] = useState({
        type: 'feedback',
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: '',
    });
    useSeo({
        title: 'Contact the newsroom',
        description: 'Send Vtime News a tip, report an error, or tell us what you think.',
        path: '/contact',
        breadcrumbs: [
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
        ],
    });

    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState(null);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setNotice(null);
        setSending(true);

        try {
            await publicApi.sendFeedback({
                type: form.type,
                subject: form.subject.trim(),
                message: form.message.trim(),
                name: form.name.trim() || undefined,
                email: form.email.trim() || undefined,
            });

            setForm((f) => ({ ...f, subject: '', message: '' }));
            setNotice({ tone: 'success', text: 'Thanks — your message reached the newsroom.' });
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'Your message could not be sent.' });
        } finally {
            setSending(false);
        }
    };

    const inputClass =
        'w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary dark:text-text-inverse font-display mb-2">
                    Get in touch
                </h1>
                <p className="text-text-muted">
                    Spotted an error, have a tip, or want to tell us what you think? Everything sent here lands in
                    the newsroom&apos;s inbox.
                </p>
            </div>

            <form onSubmit={submit} className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-6 sm:p-8 space-y-5">
                {notice && (
                    <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                        {notice.text}
                    </Notice>
                )}

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-2">
                        What&apos;s this about?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, type: type.id }))}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                                    form.type === type.id
                                        ? 'bg-primary text-white border-primary'
                                        : 'border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary'
                                }`}
                            >
                                <type.icon size={14} /> {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {!isAuthenticated && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Your name</label>
                            <input type="text" value={form.name} onChange={set('name')} maxLength={80} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Email</label>
                            <input type="email" value={form.email} onChange={set('email')} required className={inputClass} />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Subject</label>
                    <input
                        type="text"
                        value={form.subject}
                        onChange={set('subject')}
                        required
                        minLength={3}
                        maxLength={160}
                        placeholder="A short summary"
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Message</label>
                    <textarea
                        value={form.message}
                        onChange={set('message')}
                        required
                        minLength={5}
                        maxLength={4000}
                        rows={6}
                        placeholder="Tell us what happened, or what you'd like to see."
                        className={`${inputClass} resize-none`}
                    />
                    <p className="text-xs text-text-muted mt-1">{form.message.length}/4000</p>
                </div>

                <button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                    {sending ? <Spinner size={16} /> : <Send size={16} />}
                    {sending ? 'Sending…' : 'Send message'}
                </button>
            </form>
        </div>
    );
}

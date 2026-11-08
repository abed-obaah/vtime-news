import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PostCardMedium } from '@/components/ui/PostCard';
import { CardSkeleton, EmptyState, ErrorState, Notice, Spinner } from '@/components/ui/States';

export default function DashboardPage() {
    const { user, updateProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('saved');

    useSeo({ title: 'Your dashboard', description: 'Your saved and liked PulseNews stories.', noIndex: true });

    const savedQuery = useApi(() => publicApi.bookmarks(), [], { initialData: [] });
    const likedQuery = useApi(() => publicApi.likes(), [], { initialData: [] });

    const savedPosts = savedQuery.data || [];
    const likedPosts = likedQuery.data || [];

    const tabs = [
        { id: 'saved', label: 'Saved Posts', icon: Bookmark, count: savedPosts.length },
        { id: 'liked', label: 'Liked Posts', icon: Heart, count: likedPosts.length },
        { id: 'profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-8">
            <div className="mb-8 pb-6 border-b border-border dark:border-border-dark">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-2xl font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                            {user?.name || 'User'}
                        </h1>
                        <p className="text-text-muted text-sm">{user?.email}</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-1 mb-8 bg-surface-alt dark:bg-surface-dark-alt rounded-xl p-1 border border-border dark:border-border-dark">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-primary dark:hover:text-text-inverse'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-surface-alt dark:bg-surface-dark text-text-muted'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'saved' && (
                <PostGrid
                    query={savedQuery}
                    emptyIcon={Bookmark}
                    emptyTitle="No saved posts yet"
                    emptyMessage="Save articles to read them later."
                />
            )}

            {activeTab === 'liked' && (
                <PostGrid
                    query={likedQuery}
                    emptyIcon={Heart}
                    emptyTitle="No liked posts yet"
                    emptyMessage="Stories you like will collect here."
                />
            )}

            {activeTab === 'profile' && <ProfileForm user={user} updateProfile={updateProfile} />}
        </div>
    );
}

function PostGrid({ query, emptyIcon, emptyTitle, emptyMessage }) {
    const posts = query.data || [];

    if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;

    if (query.loading && posts.length === 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <CardSkeleton count={2} />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                message={emptyMessage}
                action={
                    <Link to="/" className="inline-block mt-4 text-primary font-semibold hover:underline">
                        Browse articles
                    </Link>
                }
            />
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((post) => (
                <PostCardMedium key={post.id} post={post} />
            ))}
        </div>
    );
}

function ProfileForm({ user, updateProfile }) {
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        bio: user?.bio || '',
        current_password: '',
        password: '',
    });
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null);

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setNotice(null);

        if (form.password && form.password.length < 6) {
            setNotice({ tone: 'error', text: 'A new password needs at least 6 characters.' });
            return;
        }

        setSaving(true);

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            bio: form.bio,
        };

        if (form.password) {
            payload.password = form.password;
            payload.current_password = form.current_password;
        }

        const result = await updateProfile(payload);

        setSaving(false);

        if (result.success) {
            setForm((f) => ({ ...f, current_password: '', password: '' }));
            setNotice({ tone: 'success', text: 'Profile updated.' });
        } else {
            setNotice({ tone: 'error', text: result.error });
        }
    };

    const inputClass =
        'w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <form onSubmit={submit} className="max-w-lg">
            <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6 space-y-5">
                {notice && (
                    <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                        {notice.text}
                    </Notice>
                )}

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Name</label>
                    <input type="text" value={form.name} onChange={set('name')} required className={inputClass} />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={set('email')} required className={inputClass} />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Bio</label>
                    <textarea value={form.bio} onChange={set('bio')} rows={3} maxLength={500} className={`${inputClass} resize-none`} />
                </div>

                <div className="pt-4 border-t border-border dark:border-border-dark space-y-4">
                    <p className="text-xs text-text-muted">Leave the password fields blank to keep your current password.</p>

                    <div>
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Current password</label>
                        <input type="password" value={form.current_password} onChange={set('current_password')} autoComplete="current-password" className={inputClass} />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">New password</label>
                        <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" className={inputClass} />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                >
                    {saving && <Spinner size={14} />}
                    {saving ? 'Saving…' : 'Update Profile'}
                </button>
            </div>
        </form>
    );
}

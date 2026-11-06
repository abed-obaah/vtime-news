import { useEffect, useState } from 'react';
import { Ban, Search, Shield, Trash2, Users as UsersIcon } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState, ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const ROLE_COLORS = {
    admin: 'bg-primary/10 text-primary',
    editor: 'bg-accent/10 text-accent',
    user: 'bg-info/10 text-info',
};

const STATUS_COLORS = {
    active: 'bg-success/10 text-success',
    restricted: 'bg-accent/10 text-accent',
    banned: 'bg-danger/10 text-danger',
};

export default function AdminUsers() {
    const { user: me } = useAuth();

    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebounced(search);
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const query = useApi(
        () => adminApi.users({ q: debounced || undefined, per_page: 25, page }),
        [debounced, page]
    );

    const users = query.data?.items ?? [];
    const meta = query.data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;

    const changeRole = async (user, role) => {
        setBusyId(user.id);
        setNotice(null);

        try {
            await adminApi.updateUser(user.id, { role });
            setNotice({ tone: 'success', text: `${user.name} is now ${role === 'user' ? 'a reader' : `an ${role}`}.` });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That change was rejected.' });
        } finally {
            setBusyId(null);
        }
    };

    const toggleBan = async (user) => {
        const banning = user.status !== 'banned';

        if (banning && !window.confirm(`Suspend ${user.name}? They will not be able to sign in or comment.`)) {
            return;
        }

        setBusyId(user.id);
        setNotice(null);

        try {
            await adminApi.updateUser(user.id, { status: banning ? 'banned' : 'active' });
            setNotice({ tone: 'success', text: `${user.name} ${banning ? 'suspended' : 'reinstated'}.` });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That change was rejected.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (user) => {
        if (!window.confirm(`Delete ${user.name}? Their comments will be kept but unattributed.`)) return;

        setBusyId(user.id);
        setNotice(null);

        try {
            await adminApi.deleteUser(user.id);
            setNotice({ tone: 'success', text: `${user.name} deleted.` });
            await query.refetch();
        } catch (err) {
            setNotice({ tone: 'error', text: err?.message || 'That user could not be deleted.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Users Manager
                    </h1>
                    {meta && <p className="text-text-muted text-sm mt-1">{meta.total} accounts</p>}
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="pl-9 pr-4 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
                    />
                </div>
            </div>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {query.error ? (
                <ErrorState error={query.error} onRetry={query.refetch} />
            ) : query.loading && users.length === 0 ? (
                <LoadingState label="Loading users…" />
            ) : users.length === 0 ? (
                <EmptyState icon={UsersIcon} title="No users found" message={debounced ? `Nothing matches “${debounced}”.` : undefined} />
            ) : (
                <>
                    <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-surface-alt dark:bg-surface-dark border-b border-border dark:border-border-dark">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Comments</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-border-dark">
                                    {users.map((u) => {
                                        const isMe = String(u.id) === String(me?.id);

                                        return (
                                            <tr key={u.id} className="hover:bg-surface-alt/50 dark:hover:bg-surface-dark/50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-semibold text-text-primary dark:text-text-inverse">
                                                            {u.name}
                                                            {isMe && <span className="text-xs text-text-muted font-normal ml-1">(you)</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-text-muted">{u.email}</td>
                                                <td className="px-5 py-3.5">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => changeRole(u, e.target.value)}
                                                        disabled={busyId === u.id || isMe}
                                                        className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize border-0 cursor-pointer disabled:cursor-not-allowed ${ROLE_COLORS[u.role] || ''}`}
                                                    >
                                                        <option value="user">user</option>
                                                        <option value="editor">editor</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[u.status] || ''}`}>
                                                        {u.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-text-muted">{u.commentsCount ?? 0}</td>
                                                <td className="px-5 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                                    {formatRelativeDate(u.createdAt)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {busyId === u.id && <Spinner size={14} className="text-primary mr-1" />}

                                                        {!isMe && (
                                                            <>
                                                                <button
                                                                    onClick={() => toggleBan(u)}
                                                                    disabled={busyId === u.id}
                                                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${u.status === 'banned' ? 'hover:bg-success/10 text-success' : 'hover:bg-danger/10 text-danger'}`}
                                                                    title={u.status === 'banned' ? 'Reinstate' : 'Suspend'}
                                                                >
                                                                    {u.status === 'banned' ? <Shield size={16} /> : <Ban size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => remove(u)}
                                                                    disabled={busyId === u.id}
                                                                    className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors cursor-pointer disabled:opacity-40"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
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

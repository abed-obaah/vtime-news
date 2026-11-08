import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    BarChart3, ChevronLeft, ChevronRight, ExternalLink, FileText, FolderOpen,
    Inbox, LayoutDashboard, LogOut, Megaphone, MessageCircle, MessageSquare,
    MonitorPlay, Plus, Radio, Rss, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import logo from '@/assets/logo.png';

const navItems = [
    { path: '/onlyadmindashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { path: '/onlyadmindashboard/moderation', label: 'Moderation', icon: Inbox, badge: 'pending' },
    { path: '/onlyadmindashboard/posts', label: 'Posts', icon: FileText },
    { path: '/onlyadmindashboard/posts/create', label: 'Create Post', icon: Plus },
    { path: '/onlyadmindashboard/feeds', label: 'RSS Feeds', icon: Rss },
    { path: '/onlyadmindashboard/categories', label: 'Categories', icon: FolderOpen },
    { path: '/onlyadmindashboard/users', label: 'Users', icon: Users },
    { path: '/onlyadmindashboard/comments', label: 'Comments', icon: MessageSquare, badge: 'comments' },
    { path: '/onlyadmindashboard/live', label: 'Live Broadcasts', icon: Radio, badge: 'live' },
    { path: '/onlyadmindashboard/ads', label: 'Ads', icon: MonitorPlay },
    { path: '/onlyadmindashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/onlyadmindashboard/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/onlyadmindashboard/feedback', label: 'Feedback', icon: MessageCircle },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    // Queue sizes drive the sidebar badges; a failure here must not break the panel.
    const { data: postCounts } = useApi(() => adminApi.postCounts(), [], { initialData: null });
    const { data: commentCounts } = useApi(() => adminApi.commentCounts(), [], { initialData: null });
    const { data: liveCounts } = useApi(() => adminApi.liveCounts(), [], { initialData: null });

    const badges = {
        pending: postCounts?.pending || 0,
        comments: (commentCounts?.flagged || 0) + (commentCounts?.pending || 0),
        live: liveCounts?.live || 0,
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-surface-alt dark:bg-surface-dark">
            <aside
                className={`${collapsed ? 'w-18' : 'w-60'} bg-white dark:bg-surface-dark-alt border-r border-border dark:border-border-dark flex flex-col transition-all duration-300 shrink-0 sticky top-0 h-screen`}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-border dark:border-border-dark shrink-0">
                    {!collapsed && (
                        <Link to="/" className="flex items-center gap-2 min-w-0">
                            <img src={logo} alt="PulseNews" className="h-9 w-auto object-contain shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted truncate">Newsroom</span>
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed((c) => !c)}
                        className="p-1.5 rounded-lg hover:bg-surface-alt dark:hover:bg-surface-dark text-text-muted transition-colors cursor-pointer"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const count = item.badge ? badges[item.badge] : 0;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-text-secondary dark:text-text-muted hover:bg-surface-alt dark:hover:bg-surface-dark hover:text-text-primary dark:hover:text-text-inverse'
                                    }`
                                }
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="relative shrink-0">
                                    <item.icon size={18} />
                                    {collapsed && count > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </span>
                                {!collapsed && (
                                    <>
                                        <span className="flex-1">{item.label}</span>
                                        {count > 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-border dark:border-border-dark shrink-0">
                    {!collapsed && (
                        <>
                            <Link
                                to="/"
                                className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-sm text-text-secondary dark:text-text-muted hover:text-primary transition-colors"
                            >
                                <ExternalLink size={16} /> View live site
                            </Link>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                    {user?.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-text-primary dark:text-text-inverse truncate">
                                        {user?.name}
                                    </p>
                                    <p className="text-[10px] text-text-muted truncate capitalize">{user?.role}</p>
                                </div>
                            </div>
                        </>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`}
                        title="Log out"
                    >
                        <LogOut size={16} />
                        {!collapsed && 'Log Out'}
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}

import { Link } from 'react-router-dom';
import {
    ArrowDownRight, ArrowUpRight, BarChart3, Eye, FileText, Inbox,
    MessageSquare, Rss, TrendingUp, Users,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatNumber, formatRelativeDate } from '@/utils/helpers';
import { ErrorState, LoadingState } from '@/components/ui/States';

const STAT_META = {
    posts: { label: 'Total Posts', icon: FileText, color: 'text-info bg-info/10' },
    views: { label: 'Total Views', icon: Eye, color: 'text-success bg-success/10' },
    users: { label: 'Total Users', icon: Users, color: 'text-accent bg-accent/10' },
    comments: { label: 'Comments', icon: MessageSquare, color: 'text-primary bg-primary/10' },
};

export default function AdminOverview() {
    const { data, loading, error, refetch } = useApi(() => adminApi.overview(), []);

    if (loading && !data) return <LoadingState label="Loading the newsroom…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (!data) return null;

    const { stats, queue, topPosts, activity, weeklyTraffic } = data;
    const maxTraffic = Math.max(1, ...weeklyTraffic.map((d) => d.views));

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                    Dashboard Overview
                </h1>
                <p className="text-text-muted text-sm mt-1">Here&apos;s what&apos;s happening across PulseNews.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {Object.entries(STAT_META).map(([key, meta]) => {
                    const stat = stats[key] || { value: 0, change: '0%' };
                    const up = !String(stat.change).startsWith('-');

                    return (
                        <div
                            key={key}
                            className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${meta.color}`}>
                                    <meta.icon size={20} />
                                </div>
                                <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-success' : 'text-danger'}`}>
                                    {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-text-primary dark:text-text-inverse">
                                {formatNumber(stat.value)}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">{meta.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Work waiting */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <QueueCard
                    to="/onlyadmindashboard/moderation"
                    icon={Inbox}
                    label="Waiting for review"
                    value={queue.pendingPosts}
                    tone={queue.pendingPosts > 0 ? 'primary' : 'muted'}
                />
                <QueueCard
                    to="/onlyadmindashboard/posts?status=draft"
                    icon={FileText}
                    label="Drafts"
                    value={queue.draftPosts}
                    tone="muted"
                />
                <QueueCard
                    to="/onlyadmindashboard/comments"
                    icon={MessageSquare}
                    label="Comments to check"
                    value={queue.flaggedComments}
                    tone={queue.flaggedComments > 0 ? 'accent' : 'muted'}
                />
                <QueueCard
                    to="/onlyadmindashboard/feeds"
                    icon={Rss}
                    label={queue.failingFeeds > 0 ? `${queue.failingFeeds} feed(s) failing` : 'Active feeds'}
                    value={queue.failingFeeds > 0 ? queue.failingFeeds : queue.activeFeeds}
                    tone={queue.failingFeeds > 0 ? 'danger' : 'muted'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Top posts */}
                <div className="lg:col-span-3 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark">
                    <div className="px-5 py-4 border-b border-border dark:border-border-dark flex items-center justify-between">
                        <h2 className="font-bold text-text-primary dark:text-text-inverse flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary" /> Top Performing Posts
                        </h2>
                        <Link to="/onlyadmindashboard/analytics" className="text-xs font-semibold text-primary hover:underline">
                            Analytics
                        </Link>
                    </div>
                    <div className="divide-y divide-border dark:divide-border-dark">
                        {topPosts.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm text-text-muted">
                                Nothing published yet.
                            </p>
                        )}
                        {topPosts.map((post, i) => (
                            <Link
                                key={post.id}
                                to={`/article/${post.slug}`}
                                className="px-5 py-3.5 flex items-center gap-4 hover:bg-surface-alt/60 dark:hover:bg-surface-dark/50 transition-colors"
                            >
                                <span className="text-lg font-bold text-text-muted/30 w-6 text-center shrink-0">{i + 1}</span>
                                {post.image && (
                                    <img src={post.image} alt="" className="w-12 h-9 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-primary dark:text-text-inverse truncate">
                                        {post.title}
                                    </p>
                                    <p className="text-xs text-text-muted">{post.categoryName || 'Uncategorised'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-text-primary dark:text-text-inverse">
                                        {formatNumber(post.views)}
                                    </p>
                                    <p className="text-[10px] text-text-muted">views</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark">
                    <div className="px-5 py-4 border-b border-border dark:border-border-dark">
                        <h2 className="font-bold text-text-primary dark:text-text-inverse">Recent Activity</h2>
                    </div>
                    <div className="divide-y divide-border dark:divide-border-dark">
                        {activity.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm text-text-muted">No activity logged yet.</p>
                        )}
                        {activity.map((item) => (
                            <div key={item.id} className="px-5 py-3.5">
                                <p className="text-sm font-medium text-text-primary dark:text-text-inverse">{item.action}</p>
                                {item.detail && <p className="text-xs text-text-muted truncate mt-0.5">{item.detail}</p>}
                                <p className="text-[10px] text-text-muted mt-1">
                                    {formatRelativeDate(item.createdAt)}
                                    {item.user ? ` · ${item.user}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Weekly traffic */}
            <div className="mt-8 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6">
                <div className="flex items-center gap-2 mb-6">
                    <BarChart3 size={20} className="text-primary" />
                    <h2 className="font-bold text-text-primary dark:text-text-inverse">Weekly Traffic</h2>
                </div>
                <div className="flex items-end gap-2 h-40">
                    {weeklyTraffic.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <div
                                className="w-full bg-primary rounded-t-lg relative group hover:bg-primary-dark transition-colors min-h-[4px]"
                                style={{ height: `${(day.views / maxTraffic) * 100}%` }}
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-dark text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {formatNumber(day.views)} views
                                </div>
                            </div>
                            <span className="text-[10px] text-text-muted">{day.day}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function QueueCard({ to, icon: Icon, label, value, tone }) {
    const tones = {
        primary: 'text-primary bg-primary/10 border-primary/20',
        accent: 'text-accent bg-accent/10 border-accent/20',
        danger: 'text-danger bg-danger/10 border-danger/20',
        muted: 'text-text-muted bg-surface-alt dark:bg-surface-dark border-border dark:border-border-dark',
    };

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-transform hover:-translate-y-0.5 ${tones[tone]}`}
        >
            <Icon size={20} className="shrink-0" />
            <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{value}</p>
                <p className="text-xs mt-1 truncate">{label}</p>
            </div>
        </Link>
    );
}

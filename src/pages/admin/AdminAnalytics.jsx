import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Clock, Eye, FileText, Rss, Star, ThumbsUp, Users } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatNumber } from '@/utils/helpers';
import { ErrorState, LoadingState } from '@/components/ui/States';

const RANGES = [
    { days: 7, label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
];

export default function AdminAnalytics() {
    const [days, setDays] = useState(30);
    const { data, loading, error, refetch } = useApi(() => adminApi.analytics(days), [days]);

    if (loading && !data) return <LoadingState label="Crunching the numbers…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (!data) return null;

    const { totals, categories, daily, topPosts, sources } = data;

    const maxViews = Math.max(1, ...daily.map((d) => d.views));
    const totalCategoryViews = Math.max(1, categories.reduce((sum, c) => sum + c.totalViews, 0));

    // A 90-day series is too dense for every label; show roughly ten.
    const labelEvery = Math.max(1, Math.ceil(daily.length / 10));

    const cards = [
        { label: 'Total Views', value: formatNumber(totals.views), icon: Eye, color: 'text-info bg-info/10' },
        { label: 'Total Likes', value: formatNumber(totals.likes), icon: ThumbsUp, color: 'text-primary bg-primary/10' },
        { label: 'Avg Rating', value: totals.avgRating ? `${totals.avgRating} ★` : '—', icon: Star, color: 'text-accent bg-accent/10' },
        { label: 'Avg Read Time', value: `${totals.avgReadTime} min`, icon: Clock, color: 'text-success bg-success/10' },
        { label: 'Published', value: formatNumber(totals.publishedPosts), icon: FileText, color: 'text-info bg-info/10' },
        { label: 'Comments', value: formatNumber(totals.comments), icon: BarChart3, color: 'text-primary bg-primary/10' },
        { label: 'Readers', value: formatNumber(totals.subscribers), icon: Users, color: 'text-accent bg-accent/10' },
    ];

    return (
        <div className="p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Analytics</h1>
                <div className="flex gap-2">
                    {RANGES.map((range) => (
                        <button
                            key={range.days}
                            onClick={() => setDays(range.days)}
                            className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                                days === range.days
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white dark:bg-surface-dark-alt border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary'
                            }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                        <div className={`inline-flex p-2 rounded-xl ${card.color} mb-3`}>
                            <card.icon size={18} />
                        </div>
                        <p className="text-2xl font-bold text-text-primary dark:text-text-inverse">{card.value}</p>
                        <p className="text-xs text-text-muted">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Daily traffic */}
            <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6 mb-8">
                <h2 className="font-bold text-text-primary dark:text-text-inverse mb-6">
                    Traffic — last {days} days
                </h2>

                {daily.every((d) => d.views === 0) ? (
                    <p className="text-sm text-text-muted py-12 text-center">
                        No page views recorded in this window yet.
                    </p>
                ) : (
                    <>
                        <div className="flex items-end gap-1 h-48 overflow-x-auto">
                            {daily.map((d, i) => (
                                <div key={d.date} className="flex-1 min-w-[8px] flex flex-col items-center gap-2 h-full justify-end group">
                                    <div className="relative w-full flex-1 flex items-end">
                                        <div
                                            className="w-full rounded-t bg-primary/25 relative"
                                            style={{ height: `${(d.views / maxViews) * 100}%`, minHeight: d.views > 0 ? '3px' : '0' }}
                                        >
                                            <div
                                                className="absolute inset-x-0 bottom-0 bg-primary rounded-t"
                                                style={{ height: d.views > 0 ? `${(d.visitors / d.views) * 100}%` : '0' }}
                                            />
                                        </div>
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-surface-dark text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                            {d.date}: {formatNumber(d.views)} views · {formatNumber(d.visitors)} visitors
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-text-muted h-3">
                                        {i % labelEvery === 0 ? d.day : ''}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/25" /> Views</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Unique visitors</span>
                        </div>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category performance */}
                <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6">
                    <h2 className="font-bold text-text-primary dark:text-text-inverse mb-4">Section Performance</h2>
                    <div className="space-y-3">
                        {categories.filter((c) => c.postCount > 0).length === 0 && (
                            <p className="text-sm text-text-muted">No published stories yet.</p>
                        )}
                        {categories
                            .filter((c) => c.postCount > 0)
                            .map((cat) => (
                                <div key={cat.id} className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                    <span className="text-sm font-medium text-text-primary dark:text-text-inverse w-24 truncate">
                                        {cat.name}
                                    </span>
                                    <div className="flex-1 bg-surface-alt dark:bg-surface-dark rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(cat.totalViews / totalCategoryViews) * 100}%`,
                                                backgroundColor: cat.color,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-text-muted w-14 text-right">{formatNumber(cat.totalViews)}</span>
                                    <span className="text-xs text-text-muted w-14 text-right">
                                        {cat.postCount} post{cat.postCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Wire sources */}
                <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-6">
                    <h2 className="font-bold text-text-primary dark:text-text-inverse mb-4 flex items-center gap-2">
                        <Rss size={17} className="text-primary" /> Wire Sources
                    </h2>
                    {sources.length === 0 ? (
                        <p className="text-sm text-text-muted">
                            No feeds configured.{' '}
                            <Link to="/onlyadmindashboard/feeds" className="text-primary hover:underline">
                                Add one
                            </Link>
                            .
                        </p>
                    ) : (
                        <div className="space-y-2.5">
                            {sources.map((source) => (
                                <div key={source.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border dark:border-border-dark last:border-0">
                                    <span className="text-sm text-text-primary dark:text-text-inverse truncate">{source.name}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {source.lastStatus === 'failed' && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger">failing</span>
                                        )}
                                        <span className="text-xs text-text-muted">{source.postsCount} stories</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Top posts */}
            <div className="mt-6 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark">
                <div className="px-6 py-4 border-b border-border dark:border-border-dark">
                    <h2 className="font-bold text-text-primary dark:text-text-inverse">Most Read Stories</h2>
                </div>
                <div className="divide-y divide-border dark:divide-border-dark">
                    {topPosts.length === 0 && <p className="px-6 py-8 text-sm text-text-muted text-center">Nothing published yet.</p>}
                    {topPosts.map((post, i) => (
                        <Link
                            key={post.id}
                            to={`/article/${post.slug}`}
                            target="_blank"
                            className="px-6 py-3 flex items-center gap-4 hover:bg-surface-alt/60 dark:hover:bg-surface-dark/50 transition-colors"
                        >
                            <span className="text-sm font-bold text-text-muted/40 w-5 shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary dark:text-text-inverse truncate">{post.title}</p>
                                <p className="text-xs text-text-muted">{post.categoryName || 'Uncategorised'}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-muted shrink-0">
                                <span>{formatNumber(post.views)} views</span>
                                <span>{formatNumber(post.likes)} likes</span>
                                <span>{post.rating ? `${post.rating} ★` : '—'}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

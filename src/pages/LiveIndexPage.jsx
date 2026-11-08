import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Users, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import { liveApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate, formatNumber } from '@/utils/helpers';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';

const REFRESH_MS = 15000;

export default function LiveIndexPage() {
    const { isAuthenticated } = useAuth();
    const { data: streams, loading, error, refetch } = useApi(() => liveApi.list(), [], { initialData: [] });

    useSeo({
        title: 'Live now',
        description: 'Watch breaking news reported live by Vtime News readers and editors.',
    });

    // Who's live changes constantly — keep the rail fresh without a hard reload.
    useEffect(() => {
        const id = setInterval(refetch, REFRESH_MS);
        return () => clearInterval(id);
    }, [refetch]);

    const list = streams || [];

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        <Radio className="text-danger" size={26} />
                        Live Now
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Breaking news, reported live by the Vtime News community.
                    </p>
                </div>
                <Link
                    to={isAuthenticated ? '/live/go' : '/login'}
                    state={isAuthenticated ? undefined : { from: '/live/go' }}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-danger text-white text-sm font-semibold rounded-xl hover:bg-danger/90 transition-colors"
                >
                    <Video size={16} /> Go Live
                </Link>
            </div>

            {error ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : loading && list.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <CardSkeleton count={3} />
                </div>
            ) : list.length === 0 ? (
                <EmptyState
                    icon={Radio}
                    title="No one is live right now"
                    message="When a reporter goes live, their broadcast will show up here."
                    action={
                        <Link
                            to={isAuthenticated ? '/live/go' : '/login'}
                            state={isAuthenticated ? undefined : { from: '/live/go' }}
                            className="inline-block mt-4 text-primary font-semibold hover:underline"
                        >
                            Start the first broadcast
                        </Link>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {list.map((stream) => (
                        <LiveCard key={stream.id} stream={stream} />
                    ))}
                </div>
            )}
        </div>
    );
}

function LiveCard({ stream }) {
    return (
        <Link
            to={`/live/${stream.roomName}`}
            className="group bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden hover:shadow-lg transition-shadow"
        >
            <div className="aspect-16/10 bg-surface-dark flex items-center justify-center relative">
                <Video className="text-white/30" size={40} />
                <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-danger text-white text-[10px] font-bold uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                </span>
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-semibold">
                    <Users size={11} /> {formatNumber(stream.viewerCount)}
                </span>
            </div>
            <div className="p-4">
                {stream.category && (
                    <span
                        className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: `${stream.category.color}1a`, color: stream.category.color }}
                    >
                        {stream.category.name}
                    </span>
                )}
                <h3 className="font-bold text-sm text-text-primary dark:text-text-inverse line-clamp-2 group-hover:text-primary transition-colors">
                    {stream.title}
                </h3>
                <div className="flex items-center gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                        {stream.host.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <p className="text-xs text-text-muted truncate">
                        {stream.host.name} · {formatRelativeDate(stream.startedAt)}
                    </p>
                </div>
            </div>
        </Link>
    );
}

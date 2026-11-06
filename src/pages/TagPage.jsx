import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Hash } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PostCardMedium } from '@/components/ui/PostCard';
import AdBanner from '@/components/ui/AdBanner';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { useSeo } from '@/hooks/useSeo';

export default function TagPage() {
    const { tag } = useParams();

    const { data, loading, error, refetch } = useApi(
        () => publicApi.posts({ tag, per_page: 30 }),
        [tag]
    );

    useSeo({
        title: `#${tag}`,
        description: `Every Vtime News story tagged #${tag}.`,
        path: `/tag/${tag}`,
        breadcrumbs: [
            { name: 'Home', path: '/' },
            { name: `#${tag}`, path: `/tag/${tag}` },
        ],
    });

    const posts = data?.items ?? [];
    const total = data?.meta?.total ?? posts.length;

    return (
        <div className="max-w-275 mx-auto px-4 py-8">
            <div className="mb-8 pb-6 border-b border-border dark:border-border-dark">
                <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
                    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                    <span>/</span>
                    <span>Tags</span>
                </div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-text-inverse font-display flex items-center gap-2">
                    <Hash size={28} className="text-primary" />
                    {tag}
                </h1>
                <p className="text-text-muted mt-1 text-sm uppercase tracking-wide">
                    {loading ? 'Loading…' : `${total} ${total === 1 ? 'article' : 'articles'}`}
                </p>
            </div>

            <AdBanner placement="inline" className="!mt-0" />

            {error ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : loading && posts.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <CardSkeleton count={6} />
                </div>
            ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <PostCardMedium key={post.id} post={post} />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={Hash}
                    title={`Nothing tagged #${tag}`}
                    message="No published articles carry this tag right now."
                    action={
                        <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline mt-4">
                            <ArrowLeft size={18} /> Back to Home
                        </Link>
                    }
                />
            )}
        </div>
    );
}

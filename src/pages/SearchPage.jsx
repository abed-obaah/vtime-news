import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PostCardHorizontal } from '@/components/ui/PostCard';
import AdBanner from '@/components/ui/AdBanner';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useSeo } from '@/hooks/useSeo';

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [input, setInput] = useState(query);
    const [syncedQuery, setSyncedQuery] = useState(query);

    // Keep the box in step with back/forward navigation. Adjusting state
    // during render (rather than in an effect) is React's documented way to
    // reset state when a prop changes.
    if (syncedQuery !== query) {
        setSyncedQuery(query);
        setInput(query);
    }

    const { data, loading, error, refetch } = useApi(
        () => publicApi.posts({ q: query, per_page: 30 }),
        [query],
        { enabled: query.trim().length > 0 }
    );

    // Search result pages are thin content — keep them out of the index.
    useSeo({
        title: query ? `Search: ${query}` : 'Search',
        description: 'Search Vtime News for articles, topics and trending stories.',
        path: '/search',
        noIndex: true,
    });

    const results = data?.items ?? [];
    const total = data?.meta?.total ?? results.length;

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (trimmed) setSearchParams({ q: trimmed });
        else setSearchParams({});
    };

    return (
        <div className="max-w-[900px] mx-auto px-4 py-10">
            <form onSubmit={handleSubmit} className="mb-10">
                <div className="relative">
                    <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search articles, topics, tags..."
                        className="w-full pl-12 pr-12 py-4 text-lg border-2 border-border dark:border-border-dark rounded-2xl bg-white dark:bg-surface-dark-alt text-text-primary dark:text-text-inverse focus:outline-none focus:border-primary transition-colors"
                        autoFocus
                    />
                    {input && (
                        <button
                            type="button"
                            onClick={() => {
                                setInput('');
                                setSearchParams({});
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer"
                            aria-label="Clear search"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </form>

            <AdBanner placement="inline" className="!mt-0" />

            {!query ? (
                <EmptyState
                    icon={Search}
                    title="Search Vtime News"
                    message="Find articles, topics, and trending stories."
                />
            ) : loading ? (
                <LoadingState label={`Searching for “${query}”…`} />
            ) : error ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : results.length > 0 ? (
                <>
                    <p className="text-sm text-text-muted mb-6">
                        {total} {total === 1 ? 'result' : 'results'} for “{query}”
                    </p>
                    <div className="space-y-6">
                        {results.map((post) => (
                            <PostCardHorizontal key={post.id} post={post} />
                        ))}
                    </div>
                </>
            ) : (
                <EmptyState
                    icon={Search}
                    title="No results found"
                    message={
                        <>
                            Try different keywords or browse our{' '}
                            <Link to="/" className="text-primary font-semibold hover:underline">
                                homepage
                            </Link>
                            .
                        </>
                    }
                />
            )}
        </div>
    );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { useSite } from '@/contexts/SiteContext';
import { PostCardMedium, PostCardSmall } from '@/components/ui/PostCard';
import AdBanner from '@/components/ui/AdBanner';
import { CardSkeleton, EmptyState, ErrorState, Spinner } from '@/components/ui/States';
import { ForexMarketOverview, ForexTickerTape } from '@/components/widgets/ForexMarketWidgets';
import { useSeo } from '@/hooks/useSeo';

const PER_PAGE = 12;

export default function CategoryPage() {
    const { slug } = useParams();
    const { categories, categoriesLoading } = useSite();
    const [sort, setSort] = useState('latest');
    const [page, setPage] = useState(1);

    const category = categories.find((c) => c.slug === slug);

    const { data, loading, error, refetch } = useApi(
        () => publicApi.posts({ category: slug, sort, per_page: PER_PAGE, page }),
        [slug, sort, page]
    );

    const { data: trending } = useApi(
        () => publicApi.posts({ sort: 'trending', per_page: 5 }).then((r) => r.items),
        [],
        { initialData: [] }
    );

    useSeo(
        category
            ? {
                  title: `${category.name} News`,
                  description:
                      category.description ||
                      `The latest ${category.name} stories, reporting and analysis from Vtime News.`,
                  path: `/category/${category.slug}`,
                  breadcrumbs: [
                      { name: 'Home', path: '/' },
                      { name: category.name, path: `/category/${category.slug}` },
                  ],
              }
            : null
    );

    // Wait for the category list before deciding the slug is bogus.
    if (!category && !categoriesLoading && categories.length > 0) {
        return (
            <div className="max-w-350 mx-auto px-4 py-20 text-center">
                <h1 className="text-3xl font-bold text-text-primary dark:text-text-inverse mb-4 font-display">
                    Category Not Found
                </h1>
                <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                    <ArrowLeft size={18} /> Back to Home
                </Link>
            </div>
        );
    }

    const posts = data?.items ?? [];
    const meta = data?.meta ?? null;
    const lastPage = meta?.last_page ?? 1;
    const isForex = slug === 'forex';

    const changeSort = (value) => {
        setSort(value);
        setPage(1);
    };

    return (
        <div className="max-w-350 mx-auto px-4 py-8">
            {isForex && (
                <div className="mb-6 rounded-xl overflow-hidden border border-border dark:border-border-dark">
                    <ForexTickerTape />
                </div>
            )}

            <div className="mb-8 pb-6 border-b border-border dark:border-border-dark">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span
                                className="w-2 h-8 rounded-full"
                                style={{ backgroundColor: category?.color || '#6B7280' }}
                            />
                            <h1 className="text-3xl lg:text-4xl font-bold text-text-primary dark:text-text-inverse font-display">
                                {category?.name || 'Loading…'}
                            </h1>
                        </div>
                        {category?.description && (
                            <p className="text-text-secondary dark:text-text-muted ml-5">{category.description}</p>
                        )}
                    </div>

                    <select
                        value={sort}
                        onChange={(e) => changeSort(e.target.value)}
                        className="px-3 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none cursor-pointer"
                    >
                        <option value="latest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="trending">Most read</option>
                        <option value="most-liked">Most liked</option>
                        <option value="top-rated">Highest rated</option>
                    </select>
                </div>
            </div>

            {isForex && (
                <div className="mb-10 bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                    <h2 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display mb-4">
                        Market Overview
                    </h2>
                    <ForexMarketOverview />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                <div className="lg:col-span-2">
                    {error ? (
                        <ErrorState error={error} onRetry={refetch} />
                    ) : loading && posts.length === 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <CardSkeleton count={4} />
                        </div>
                    ) : posts.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {posts.map((post) => (
                                    <PostCardMedium key={post.id} post={post} />
                                ))}
                            </div>

                            {lastPage > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-10">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1 || loading}
                                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-text-muted flex items-center gap-2">
                                        {loading && <Spinner size={14} />}
                                        Page {page} of {lastPage}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                                        disabled={page >= lastPage || loading}
                                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-border dark:border-border-dark text-text-secondary dark:text-text-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <EmptyState
                            icon={Grid3X3}
                            title="No articles yet"
                            message={`Check back soon for stories in ${category?.name || 'this section'}.`}
                        />
                    )}
                </div>

                <aside>
                    <div className="sticky top-20 space-y-6">
                        <AdBanner placement="sidebar" />
                        {(trending || []).length > 0 && (
                            <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                                <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display mb-4">
                                    🔥 Trending
                                </h3>
                                <div className="space-y-5">
                                    {trending.map((p, i) => (
                                        <PostCardSmall key={p.id} post={p} index={i} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

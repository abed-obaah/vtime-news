import { Link } from 'react-router-dom';
import { ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { PostCardHorizontal, PostCardLarge, PostCardMedium, PostCardSmall } from '@/components/ui/PostCard';
import AdBanner from '@/components/ui/AdBanner';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/States';
import { useSeo } from '@/hooks/useSeo';

export default function HomePage() {
    const { data, loading, error, refetch } = useApi(() => publicApi.home(), []);

    useSeo({
        path: '/',
        description:
            'Breaking news, in-depth analysis and trending stories from around the world, checked by the Vtime News desk.',
    });

    if (loading && !data) {
        return (
            <div className="max-w-350 mx-auto px-4 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <CardSkeleton count={8} />
                </div>
            </div>
        );
    }

    if (error && !data) {
        return <ErrorState error={error} onRetry={refetch} />;
    }

    const featured = data?.featured ?? [];
    const latest = data?.latest ?? [];
    const trending = data?.trending ?? [];
    const editorPicks = data?.editorPicks ?? [];
    const sections = data?.sections ?? [];

    const hasAnything = featured.length + latest.length > 0;

    if (!hasAnything) {
        return (
            <EmptyState
                title="No stories published yet"
                message="Once the newsroom publishes its first story, it will appear right here."
                className="py-32"
            />
        );
    }

    // The hero uses the first featured story as the anchor and spreads the
    // rest across the two side columns without repeating any of them.
    const hero = featured[0] || latest[0];
    const secondHero = featured[1] || latest.find((p) => p.id !== hero?.id);
    const sideLeft = featured.slice(2, 5);
    const sideRight = featured.slice(5, 8);

    const heroIds = new Set(
        [hero, secondHero, ...sideLeft, ...sideRight].filter(Boolean).map((p) => p.id)
    );

    const latestRest = latest.filter((p) => !heroIds.has(p.id));
    const latestCards = latestRest.slice(0, 6);
    const latestMore = latestRest.slice(6);

    return (
        <div className="min-h-screen">
            {/* HERO */}
            <section className="max-w-350 w-full mx-auto px-4 pt-6 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                    <div className="hidden lg:flex flex-col gap-5">
                        {sideLeft.map((post) => (
                            <PostCardMedium key={post.id} post={post} />
                        ))}
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-5">
                        {hero && <PostCardLarge post={hero} />}
                        {secondHero && <PostCardLarge post={secondHero} />}
                    </div>

                    <div className="flex flex-col gap-5">
                        {(sideRight.length > 0 ? sideRight : sideLeft).map((post) => (
                            <PostCardMedium key={post.id} post={post} />
                        ))}
                    </div>
                </div>
            </section>

            <AdBanner placement="header-banner" />

            {/* LATEST + SIDEBAR */}
            <section className="max-w-350 mx-auto px-4 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display flex items-center gap-2">
                                <Clock size={22} className="text-primary" /> Latest News
                            </h2>
                        </div>

                        {latestCards.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {latestCards.map((post) => (
                                    <PostCardMedium key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No further stories right now.</p>
                        )}

                        <AdBanner placement="inline" />

                        {latestMore.length > 0 && (
                            <div className="mt-8 space-y-6">
                                {latestMore.map((post) => (
                                    <PostCardHorizontal key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="lg:col-span-1">
                        <div className="sticky top-20">
                            {trending.length > 0 && (
                                <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 mb-6">
                                    <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display flex items-center gap-2 mb-5">
                                        <TrendingUp size={20} className="text-primary" /> Trending Now
                                    </h3>
                                    <div className="space-y-5">
                                        {trending.map((post, i) => (
                                            <PostCardSmall key={post.id} post={post} index={i} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <AdBanner placement="sidebar" className="mb-6" />

                            {editorPicks.length > 0 && (
                                <div className="bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5">
                                    <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse font-display mb-4">
                                        ⭐ Editor&apos;s Picks
                                    </h3>
                                    <div className="space-y-4">
                                        {editorPicks.map((post) => (
                                            <PostCardSmall key={post.id} post={post} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </section>

            {/* CATEGORY SPOTLIGHTS */}
            {sections.map((section) => (
                <section key={section.category.id} className="max-w-350 mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display flex items-center gap-2">
                            <span className="w-1 h-7 rounded-full" style={{ backgroundColor: section.category.color }} />
                            {section.category.name}
                        </h2>
                        <Link
                            to={`/category/${section.category.slug}`}
                            className="text-sm font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
                        >
                            More in {section.category.name} <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {section.posts.map((post) => (
                            <PostCardMedium key={post.id} post={post} />
                        ))}
                    </div>
                </section>
            ))}

            <AdBanner placement="before-footer" />
        </div>
    );
}

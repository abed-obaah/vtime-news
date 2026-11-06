import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

export default function TopBar() {
    const { data: breaking } = useApi(
        () => publicApi.posts({ breaking: 1, per_page: 8 }).then((r) => r.items),
        [],
        { initialData: [] }
    );

    const [currentDate, setCurrentDate] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentDate(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const dateStr = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const stories = breaking || [];

    if (stories.length === 0) return null;

    return (
        <div className="bg-primary text-white text-sm overflow-hidden">
            <div className="max-w-[1600px] mx-auto flex items-center h-10">
                {/* Date - hidden on mobile */}
                <div className="hidden md:flex items-center px-4 py-2 h-full bg-primary-dark whitespace-nowrap font-medium text-xs tracking-wide uppercase">
                    {dateStr}
                </div>

                {/* Breaking ticker */}
                <div className="flex items-center gap-2 px-3 h-full bg-primary-dark font-bold text-xs tracking-wider uppercase whitespace-nowrap">
                    <Zap size={14} className="animate-pulse" />
                    BREAKING
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className="animate-ticker flex whitespace-nowrap py-2 px-4">
                        {[...stories, ...stories].map((post, i) => (
                            <span key={`${post.id}-${i}`} className="mx-8 inline-block">
                                <Link to={`/article/${post.slug}`} className="font-medium hover:underline">
                                    {post.title}
                                </Link>
                                <span className="mx-4 opacity-40">|</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

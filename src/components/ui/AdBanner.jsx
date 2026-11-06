import { useEffect, useRef } from 'react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import NetworkAdSlot from '@/components/ui/NetworkAdSlot';

/**
 * Pulls the highest-priority live ad for a placement and reports one
 * impression per mount, plus a click-through when the reader follows it.
 */
export default function AdBanner({ placement = 'sidebar', className = '' }) {
    const { data: ads } = useApi(() => publicApi.ads(placement), [placement], { initialData: [] });

    const ad = (ads || [])[0] || null;
    const reported = useRef(null);

    useEffect(() => {
        if (!ad || reported.current === ad.id) return;
        reported.current = ad.id;
        publicApi.adImpression(ad.id).catch(() => {
            /* an uncounted impression should never break the page */
        });
    }, [ad]);

    if (!ad) return null;

    // A network ad (Google AdSense, Media.net, …) is just an embedded
    // snippet — the network renders its own creative and handles its own
    // clicks, so it skips our title/description/link card entirely.
    if (ad.source === 'network') {
        return <NetworkAdWrapper ad={ad} placement={placement} className={className} />;
    }

    const handleClick = () => {
        publicApi.adClick(ad.id).catch(() => {});
    };

    const linkProps = {
        href: ad.link || '#',
        onClick: handleClick,
        target: ad.link && ad.link !== '#' ? '_blank' : undefined,
        rel: 'noopener noreferrer sponsored',
    };

    if (placement === 'header-banner') {
        return (
            <div className={`bg-linear-to-r from-surface-dark to-surface-dark-alt text-white overflow-hidden ${className}`}>
                <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted bg-surface-dark-alt px-2 py-0.5 rounded shrink-0">
                            Ad
                        </span>
                        <p className="text-sm font-medium truncate">
                            {ad.title} — <span className="text-text-muted">{ad.description}</span>
                        </p>
                    </div>
                    <a {...linkProps} className="text-xs font-semibold text-primary hover:text-primary-light whitespace-nowrap transition-colors">
                        Learn More →
                    </a>
                </div>
            </div>
        );
    }

    if (placement === 'sidebar') {
        return (
            <div className={`bg-surface-alt dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden ${className}`}>
                <div className="p-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-2">Sponsored</span>
                </div>
                {ad.image && <img src={ad.image} alt={ad.title} loading="lazy" className="w-full h-40 object-cover" />}
                <div className="p-4">
                    <h4 className="text-sm font-bold text-text-primary dark:text-text-inverse mb-1">{ad.title}</h4>
                    <p className="text-xs text-text-muted mb-3">{ad.description}</p>
                    <a {...linkProps} className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                        Learn More →
                    </a>
                </div>
            </div>
        );
    }

    if (placement === 'inline') {
        return (
            <div className={`my-8 bg-surface-alt dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark p-5 flex items-center gap-5 ${className}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">Ad</span>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-text-primary dark:text-text-inverse">{ad.title}</h4>
                    <p className="text-xs text-text-muted mt-0.5">{ad.description}</p>
                </div>
                <a {...linkProps} className="text-xs font-semibold text-primary hover:text-primary-dark whitespace-nowrap transition-colors">
                    Visit →
                </a>
            </div>
        );
    }

    if (placement === 'before-footer') {
        return (
            <div className={`bg-linear-to-r from-primary to-primary-dark text-white ${className}`}>
                <div className="max-w-350 mx-auto px-4 py-10 text-center">
                    <h3 className="text-2xl font-bold mb-2">{ad.title}</h3>
                    <p className="text-white/80 mb-5">{ad.description}</p>
                    <a {...linkProps} className="inline-block px-6 py-3 bg-white text-primary font-bold text-sm rounded-lg hover:bg-primary-light transition-colors">
                        Get Started
                    </a>
                </div>
            </div>
        );
    }

    return null;
}

/** The same placements as above, but rendering a third-party network's own snippet. */
function NetworkAdWrapper({ ad, placement, className }) {
    if (placement === 'header-banner') {
        return (
            <div className={`bg-linear-to-r from-surface-dark to-surface-dark-alt py-2 ${className}`}>
                <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">Ad</span>
                    <NetworkAdSlot code={ad.code} className="flex-1 min-w-0" />
                </div>
            </div>
        );
    }

    if (placement === 'before-footer') {
        return (
            <div className={className}>
                <div className="max-w-350 mx-auto px-4 py-6 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
                        Advertisement
                    </span>
                    <NetworkAdSlot code={ad.code} />
                </div>
            </div>
        );
    }

    // sidebar / inline / anything else: a plain labelled box.
    return (
        <div className={`bg-surface-alt dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden p-3 ${className}`}>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Sponsored</span>
            <NetworkAdSlot code={ad.code} />
        </div>
    );
}

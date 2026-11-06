import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import NetworkAdSlot from '@/components/ui/NetworkAdSlot';

const DISMISS_KEY = 'pulsenews_ad_dismissed';
const SHOW_AFTER_MS = 6000;
const SNOOZE_MS = 24 * 60 * 60 * 1000; // don't nag the same reader for a day

const readDismissals = () => {
    try {
        return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
    } catch {
        return {};
    }
};

const recordDismissal = (id) => {
    try {
        const all = readDismissals();
        all[id] = Date.now();
        localStorage.setItem(DISMISS_KEY, JSON.stringify(all));
    } catch {
        /* storage unavailable — the popup just reappears next visit */
    }
};

const wasDismissedRecently = (id) => {
    const at = readDismissals()[id];
    return typeof at === 'number' && Date.now() - at < SNOOZE_MS;
};

/**
 * The "popup" ad placement: an interstitial that appears once the reader has
 * settled on the page, is dismissible, and stays gone for a day afterwards.
 * Mounted once in the public layout rather than per page.
 */
export default function AdPopup() {
    const { data: ads } = useApi(() => publicApi.ads('popup'), [], { initialData: [] });

    const [open, setOpen] = useState(false);
    const ad = (ads || [])[0] || null;
    const counted = useRef(null);

    // Hold the timer off until we actually have an ad the reader hasn't dismissed.
    useEffect(() => {
        if (!ad || wasDismissedRecently(ad.id)) return undefined;

        const timer = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
        return () => clearTimeout(timer);
    }, [ad]);

    // One impression per ad, counted when it is actually on screen.
    useEffect(() => {
        if (!open || !ad || counted.current === ad.id) return;
        counted.current = ad.id;
        publicApi.adImpression(ad.id).catch(() => {});
    }, [open, ad]);

    // Escape closes it, and the page behind it shouldn't scroll.
    useEffect(() => {
        if (!open) return undefined;

        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!ad || !open) return null;

    function close() {
        recordDismissal(ad.id);
        setOpen(false);
    }

    const handleClick = () => {
        publicApi.adClick(ad.id).catch(() => {});
        recordDismissal(ad.id);
        setOpen(false);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Advertisement"
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <div className="relative w-full max-w-md bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark overflow-hidden shadow-2xl">
                <button
                    onClick={close}
                    aria-label="Close advertisement"
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
                >
                    <X size={16} />
                </button>

                {ad.source === 'network' ? (
                    <div className="p-6 pt-10">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
                            Sponsored
                        </span>
                        <NetworkAdSlot code={ad.code} />
                    </div>
                ) : (
                    <>
                        {ad.image && (
                            <img src={ad.image} alt="" className="w-full h-44 object-cover" />
                        )}

                        <div className="p-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                Sponsored
                            </span>
                            <h3 className="text-lg font-bold text-text-primary dark:text-text-inverse mt-2 mb-1.5 font-display">
                                {ad.title}
                            </h3>
                            {ad.description && (
                                <p className="text-sm text-text-secondary dark:text-text-muted mb-5">
                                    {ad.description}
                                </p>
                            )}

                            <div className="flex items-center gap-3">
                                <a
                                    href={ad.link || '#'}
                                    onClick={handleClick}
                                    target={ad.link && ad.link !== '#' ? '_blank' : undefined}
                                    rel="noopener noreferrer sponsored"
                                    className="flex-1 text-center px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                                >
                                    Learn More
                                </a>
                                <button
                                    onClick={close}
                                    className="px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary dark:hover:text-text-inverse transition-colors cursor-pointer"
                                >
                                    No thanks
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

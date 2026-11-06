import { useEffect, useRef, useState } from 'react';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import NetworkAdSlot from '@/components/ui/NetworkAdSlot';

const FIRED_KEY = 'pulsenews_popunder_fired';

const alreadyFired = () => {
    try {
        return sessionStorage.getItem(FIRED_KEY) === '1';
    } catch {
        return false;
    }
};

const markFired = () => {
    try {
        sessionStorage.setItem(FIRED_KEY, '1');
    } catch {
        /* private browsing etc. — worst case it can fire again next click */
    }
};

/**
 * The "popunder" placement: a window that opens behind the current one
 * instead of an in-page slot. Renders nothing visible itself.
 *
 * A network ad (source: 'network') is trusted to ship its own click-trigger
 * and window handling — PropellerAds/Adcash/PopAds/ExoClick snippets all
 * work this way — so it's injected once, hidden, and left alone. A
 * "custom" ad (just a link) gets our own behavior: open on the reader's
 * first click anywhere on the page, then blur it back behind the tab.
 * Browsers block window.open() with no user gesture behind it, so a fixed
 * delay (like the popup uses) wouldn't work here regardless.
 *
 * Capped to once per browser tab via sessionStorage — a popunder that
 * refires on every click would make the site unusable.
 */
export default function PopunderAd() {
    const { data: ads } = useApi(() => publicApi.ads('popunder'), [], { initialData: [] });
    const ad = (ads || [])[0] || null;

    const armed = useRef(false);
    // Lazy initializer — read once, at mount, never set again.
    const [skipped] = useState(alreadyFired);

    useEffect(() => {
        if (!ad || armed.current || skipped) return undefined;

        if (ad.source === 'network') {
            armed.current = true;
            markFired();
            publicApi.adImpression(ad.id).catch(() => {});
            return undefined;
        }

        const openBehind = () => {
            armed.current = true;
            markFired();

            const win = window.open(ad.link || '#', '_blank');
            if (win) {
                win.opener = null; // mitigate reverse tabnabbing without losing the reference
                win.blur();
                window.focus();
            }

            publicApi.adImpression(ad.id).catch(() => {});
        };

        document.addEventListener('click', openBehind, { once: true });
        return () => document.removeEventListener('click', openBehind);
    }, [ad, skipped]);

    if (!ad || ad.source !== 'network' || skipped) return null;

    return (
        <div style={{ display: 'none' }} aria-hidden="true">
            <NetworkAdSlot code={ad.code} />
        </div>
    );
}

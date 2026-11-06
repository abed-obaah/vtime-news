import { useEffect } from 'react';
import { applySeo } from '@/lib/seo';

/**
 * Applies page metadata to the document head. Pass `null` while data is still
 * loading so the previous page's tags are not replaced with placeholders.
 */
export function useSeo(options) {
    // Serialising keeps the effect from re-firing on every render just because
    // the caller built a fresh object literal.
    const key = options ? JSON.stringify(options) : null;

    useEffect(() => {
        if (!key) return;
        applySeo(JSON.parse(key));
    }, [key]);
}

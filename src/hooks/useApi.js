import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeError } from '@/lib/api';

/**
 * Runs an async request on mount (and whenever `deps` change), tracking
 * loading/error state and ignoring results from a request that has been
 * superseded or unmounted.
 *
 * @param {Function} fetcher  async () => data
 * @param {Array} deps        primitives; re-runs when they change
 * @param {{ enabled?: boolean, initialData?: any }} options
 */
export function useApi(fetcher, deps = [], options = {}) {
    const { enabled = true, initialData = null } = options;

    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);

    // The fetcher is a fresh closure every render; keep the latest one in a
    // ref (updated in an effect that runs before the one that calls it) so
    // `run` can stay stable across renders.
    const fetcherRef = useRef(fetcher);
    const requestId = useRef(0);
    const mounted = useRef(true);

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // deps are primitives (ids, slugs, page numbers), so a serialized key
    // gives the hook a literal dependency array ESLint can verify.
    const depsKey = JSON.stringify(deps);

    const run = useCallback(async () => {
        if (!enabled) {
            setLoading(false);
            return null;
        }

        const id = ++requestId.current;
        setLoading(true);
        setError(null);

        try {
            const result = await fetcherRef.current();

            // A newer request started (or we unmounted) — drop this result.
            if (id !== requestId.current || !mounted.current) return null;

            setData(result);
            return result;
        } catch (err) {
            if (id !== requestId.current || !mounted.current) return null;
            setError(normalizeError(err));
            return null;
        } finally {
            if (id === requestId.current && mounted.current) setLoading(false);
        }
        // depsKey is not read inside the callback — it is here on purpose, so
        // that `run` is rebuilt (and the effect below re-fires) when the
        // caller's deps change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, depsKey]);

    useEffect(() => {
        // Fetching on mount inherently flips `loading` from inside an effect;
        // that is the point of the hook, not a cascading-render bug.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        run();
    }, [run]);

    return { data, loading, error, refetch: run, setData };
}

/**
 * For one-off writes (publish, delete, submit...). Tracks in-flight state and
 * surfaces a normalized error instead of throwing at the call site.
 */
export function useAction() {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const run = useCallback(async (action) => {
        setPending(true);
        setError(null);

        try {
            const result = await action();
            return { ok: true, data: result };
        } catch (err) {
            const normalized = normalizeError(err);
            if (mounted.current) setError(normalized);
            return { ok: false, error: normalized };
        } finally {
            if (mounted.current) setPending(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { run, pending, error, clearError };
}

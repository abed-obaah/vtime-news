import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, normalizeError, setUnauthorizedHandler, tokenStore } from '@/lib/api';

const AuthContext = createContext(null);

const USER_KEY = 'pulsenews_user';

const readCachedUser = () => {
    try {
        const saved = localStorage.getItem(USER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};

const cacheUser = (user) => {
    try {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_KEY);
    } catch {
        /* storage unavailable — the session simply won't be remembered */
    }
};

export function AuthProvider({ children }) {
    // Start from the cached user so a refresh doesn't flash the signed-out UI,
    // then confirm against the API.
    const [user, setUser] = useState(() => (tokenStore.get() ? readCachedUser() : null));
    const [loading, setLoading] = useState(false);
    const [bootstrapping, setBootstrapping] = useState(() => Boolean(tokenStore.get()));

    const applyUser = useCallback((nextUser) => {
        setUser(nextUser);
        cacheUser(nextUser);
    }, []);

    const clearSession = useCallback(() => {
        tokenStore.clear();
        applyUser(null);
    }, [applyUser]);

    // The API client calls this when the server rejects our token.
    useEffect(() => {
        setUnauthorizedHandler(() => clearSession());
        return () => setUnauthorizedHandler(null);
    }, [clearSession]);

    // Confirm the stored token is still valid on first load.
    useEffect(() => {
        let cancelled = false;

        // No token means the state initializer already set bootstrapping
        // to false — nothing to confirm.
        if (!tokenStore.get()) {
            return undefined;
        }

        authApi
            .me()
            .then((fresh) => {
                if (!cancelled) applyUser(fresh);
            })
            .catch(() => {
                if (!cancelled) clearSession();
            })
            .finally(() => {
                if (!cancelled) setBootstrapping(false);
            });

        return () => {
            cancelled = true;
        };
    }, [applyUser, clearSession]);

    const login = useCallback(
        async (email, password) => {
            setLoading(true);
            try {
                const { user: signedIn, token } = await authApi.login({ email, password });
                tokenStore.set(token);
                applyUser(signedIn);
                return { success: true, user: signedIn };
            } catch (err) {
                return { success: false, error: normalizeError(err).message };
            } finally {
                setLoading(false);
            }
        },
        [applyUser]
    );

    const register = useCallback(
        async (name, email, password) => {
            setLoading(true);
            try {
                const { user: created, token } = await authApi.register({ name, email, password });
                tokenStore.set(token);
                applyUser(created);
                return { success: true, user: created };
            } catch (err) {
                return { success: false, error: normalizeError(err).message };
            } finally {
                setLoading(false);
            }
        },
        [applyUser]
    );

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            /* the token is going away locally either way */
        }
        clearSession();
    }, [clearSession]);

    const updateProfile = useCallback(
        async (payload) => {
            try {
                const { user: updated } = await authApi.updateProfile(payload);
                applyUser(updated);
                return { success: true, user: updated };
            } catch (err) {
                return { success: false, error: normalizeError(err).message };
            }
        },
        [applyUser]
    );

    const value = useMemo(
        () => ({
            user,
            login,
            register,
            logout,
            updateProfile,
            loading,
            bootstrapping,
            isAdmin: user?.role === 'admin' || user?.role === 'editor',
            isAuthenticated: Boolean(user),
        }),
        [user, login, register, logout, updateProfile, loading, bootstrapping]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/States';

/** Blocks a route until we know whether the stored session is still valid. */
function useSessionReady() {
    const { bootstrapping } = useAuth();
    return !bootstrapping;
}

export function RequireAuth({ children }) {
    const { isAuthenticated } = useAuth();
    const ready = useSessionReady();
    const location = useLocation();

    if (!ready) return <LoadingState label="Checking your session…" />;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    return children;
}

export function RequireAdmin({ children }) {
    const { isAuthenticated, isAdmin } = useAuth();
    const ready = useSessionReady();
    const location = useLocation();

    if (!ready) return <LoadingState label="Checking your session…" />;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}

/** Keeps signed-in people off the login/register screens. */
export function RedirectIfAuthenticated({ children }) {
    const { isAuthenticated, isAdmin } = useAuth();
    const ready = useSessionReady();

    if (!ready) return <LoadingState label="Checking your session…" />;

    if (isAuthenticated) {
        return <Navigate to={isAdmin ? '/onlyadmindashboard' : '/dashboard'} replace />;
    }

    return children;
}

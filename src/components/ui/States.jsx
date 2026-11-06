import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

export function Spinner({ size = 20, className = '' }) {
    return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Loading…', className = '' }) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 py-16 text-text-muted ${className}`}>
            <Spinner size={28} className="text-primary" />
            <p className="text-sm">{label}</p>
        </div>
    );
}

export function ErrorState({ error, onRetry, className = '' }) {
    const message = error?.message || 'Something went wrong.';

    return (
        <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
            <AlertCircle size={32} className="text-danger" />
            <div>
                <h3 className="text-base font-semibold text-text-primary dark:text-text-inverse">
                    We couldn&apos;t load this
                </h3>
                <p className="text-sm text-text-muted mt-1 max-w-md">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-1 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                >
                    <RefreshCw size={15} /> Try again
                </button>
            )}
        </div>
    );
}

export function EmptyState({ title = 'Nothing here yet', message, icon: Icon = Inbox, action, className = '' }) {
    return (
        <div className={`flex flex-col items-center justify-center gap-2 py-16 text-center ${className}`}>
            <Icon size={40} className="text-text-muted/30" />
            <h3 className="text-base font-semibold text-text-primary dark:text-text-inverse">{title}</h3>
            {message && <p className="text-sm text-text-muted max-w-md">{message}</p>}
            {action}
        </div>
    );
}

/** Grey card placeholders that match the PostCardMedium footprint. */
export function CardSkeleton({ count = 4, className = '' }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`bg-white dark:bg-surface-dark-alt rounded-xl border border-border dark:border-border-dark overflow-hidden animate-pulse ${className}`}
                >
                    <div className="aspect-16/10 bg-surface-alt dark:bg-surface-dark" />
                    <div className="p-5 space-y-3">
                        <div className="h-4 rounded bg-surface-alt dark:bg-surface-dark" />
                        <div className="h-4 w-3/4 rounded bg-surface-alt dark:bg-surface-dark" />
                        <div className="h-3 w-1/3 rounded bg-surface-alt dark:bg-surface-dark" />
                    </div>
                </div>
            ))}
        </>
    );
}

/** Inline banner used for form-level errors and success confirmations. */
export function Notice({ tone = 'error', children, onDismiss }) {
    if (!children) return null;

    const tones = {
        error: 'bg-danger/10 text-danger border-danger/20',
        success: 'bg-success/10 text-success border-success/20',
        info: 'bg-info/10 text-info border-info/20',
        warning: 'bg-accent/10 text-accent border-accent/20',
    };

    return (
        <div className={`flex items-start justify-between gap-3 p-3 mb-4 text-sm rounded-lg border ${tones[tone] || tones.error}`}>
            <span>{children}</span>
            {onDismiss && (
                <button onClick={onDismiss} className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer">
                    Dismiss
                </button>
            )}
        </div>
    );
}

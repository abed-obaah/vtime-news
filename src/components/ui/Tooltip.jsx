/**
 * A small hover/focus tooltip for icon-only buttons and other controls whose
 * purpose isn't spelled out in text. Pure CSS (group-hover / group-focus),
 * no extra dependency, themed for light and dark.
 */
export default function Tooltip({ label, children, side = 'top' }) {
    if (!label) return children;

    const position = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    }[side];

    return (
        <span className="relative inline-flex group/tooltip">
            {children}
            <span
                role="tooltip"
                className={`pointer-events-none absolute ${position} z-50 whitespace-nowrap rounded-lg bg-surface-dark px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 dark:bg-black`}
            >
                {label}
            </span>
        </span>
    );
}

import { useEffect, useRef } from 'react';

const SCRIPT_BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';

/**
 * Generic host for TradingView's script-tag embed widgets (Market Overview,
 * Ticker Tape, ...). These aren't React components on TradingView's end —
 * their loader script reads a JSON blob out of its own `innerHTML` and
 * renders an iframe itself — so this just recreates the exact DOM shape
 * their docs show (a `.tradingview-widget-container` holding an inner
 * `.tradingview-widget-container__widget` div plus the script, as siblings)
 * and rebuilds it whenever the config changes, since these widgets don't
 * support being reconfigured in place.
 */
export default function TradingViewEmbed({ widget, config, height = 400, className = '' }) {
    const containerRef = useRef(null);
    const configKey = JSON.stringify(config);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = '';

        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'tradingview-widget-container__widget';
        container.appendChild(widgetDiv);

        const script = document.createElement('script');
        script.src = `${SCRIPT_BASE}${widget}.js`;
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = configKey;
        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [widget, configKey]);

    return (
        <div
            ref={containerRef}
            className={`tradingview-widget-container ${className}`}
            style={{ height, width: '100%' }}
        />
    );
}

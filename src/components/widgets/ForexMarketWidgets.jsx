import TradingViewEmbed from './TradingViewEmbed';
import { useTheme } from '@/contexts/ThemeContext';

const FOREX_PAIRS = [
    { symbol: 'FX:EURUSD', label: 'EUR/USD' },
    { symbol: 'FX:GBPUSD', label: 'GBP/USD' },
    { symbol: 'FX:USDJPY', label: 'USD/JPY' },
    { symbol: 'FX:USDCHF', label: 'USD/CHF' },
    { symbol: 'FX:AUDUSD', label: 'AUD/USD' },
    { symbol: 'FX:USDCAD', label: 'USD/CAD' },
    { symbol: 'FX:NZDUSD', label: 'NZD/USD' },
    { symbol: 'FX:USDCNY', label: 'USD/CNY' },
];

const COMMODITIES = [
    { symbol: 'TVC:GOLD', label: 'Gold' },
    { symbol: 'TVC:SILVER', label: 'Silver' },
    { symbol: 'TVC:USOIL', label: 'Crude Oil WTI' },
    { symbol: 'TVC:UKOIL', label: 'Crude Oil Brent' },
];

/** Scrolling live-price bar — major FX pairs plus the commodities forex traders watch. */
export function ForexTickerTape({ className = '' }) {
    const { darkMode } = useTheme();

    return (
        <TradingViewEmbed
            widget="ticker-tape"
            height={46}
            className={className}
            config={{
                symbols: [...FOREX_PAIRS, ...COMMODITIES].map(({ symbol, label }) => ({
                    proName: symbol,
                    title: label,
                })),
                colorTheme: darkMode ? 'dark' : 'light',
                isTransparent: true,
                displayMode: 'adaptive',
                locale: 'en',
            }}
        />
    );
}

/**
 * A plain, no-chart snapshot: symbol name plus last price and change — the
 * TradingView "Market Overview" widget with its sparkline column turned
 * off. Needs no API key or backend of its own (unlike a hand-rolled table,
 * which would need a paid/registered rates feed to show real intraday
 * change figures — see the ticker tape above for the always-on live view).
 */
export function ForexMarketOverview({ className = '' }) {
    const { darkMode } = useTheme();

    return (
        <TradingViewEmbed
            widget="market-overview"
            height={390}
            className={className}
            config={{
                colorTheme: darkMode ? 'dark' : 'light',
                showChart: false,
                locale: 'en',
                isTransparent: true,
                showSymbolLogo: true,
                showFloatingTooltip: false,
                tabs: [
                    {
                        title: 'Forex',
                        originalTitle: 'Forex',
                        symbols: FOREX_PAIRS.map(({ symbol, label }) => ({ s: symbol, d: label })),
                    },
                    {
                        title: 'Commodities',
                        originalTitle: 'Commodities',
                        symbols: COMMODITIES.map(({ symbol, label }) => ({ s: symbol, d: label })),
                    },
                ],
            }}
        />
    );
}

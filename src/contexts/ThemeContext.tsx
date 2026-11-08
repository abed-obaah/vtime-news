import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pulse_theme';

// Exact colors from the PulseNews website (src/index.css CSS variables)
const darkColors = {
  bg: '#0F172A',           // --color-surface-dark
  bgCard: '#1E293B',       // --color-surface-dark-alt
  bgInput: '#1E293B',
  bgBtn: '#334155',        // --color-border-dark used as chip/button bg
  text: '#F8FAFC',         // --color-text-inverse
  textSecondary: '#94A3B8',// --color-text-muted
  textMuted: '#64748B',
  border: '#334155',       // --color-border-dark
  borderLight: '#1E293B',
  tabBar: '#0F172A',
  separator: '#1E293B',
  accent: '#DC2626',       // --color-primary
  accentDark: '#B91C1C',   // --color-primary-dark
  icon: '#94A3B8',
  iconBack: '#F8FAFC',
};

const lightColors = {
  bg: '#F8FAFC',           // --color-surface-alt
  bgCard: '#FFFFFF',       // --color-surface
  bgInput: '#FFFFFF',
  bgBtn: '#E2E8F0',        // --color-border
  text: '#0F172A',         // --color-text-primary
  textSecondary: '#475569',// --color-text-secondary
  textMuted: '#94A3B8',    // --color-text-muted
  border: '#E2E8F0',       // --color-border
  borderLight: '#F1F5F9',
  tabBar: '#FFFFFF',
  separator: '#E2E8F0',
  accent: '#DC2626',       // --color-primary
  accentDark: '#B91C1C',   // --color-primary-dark
  icon: '#475569',
  iconBack: '#0F172A',
};

export type Colors = typeof darkColors;

type ThemeContextValue = {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(val => { if (val !== null) setIsDark(val === 'dark'); })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

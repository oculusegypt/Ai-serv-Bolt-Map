import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { theme as lightTheme, shadows as lightShadows } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeValue = {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark';
  theme: typeof lightTheme;
  shadows: typeof lightShadows;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = 'settings.themeMode';

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

function resolveScheme(mode: ThemeMode, system: ColorSchemeName): 'light' | 'dark' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

function buildDarkTheme(base: typeof lightTheme): typeof lightTheme {
  return {
    ...base,
    background: '#0B1220',
    backgroundSecondary: '#0F172A',
    surface: '#111827',
    surfaceSecondary: '#0B1220',
    textPrimary: '#E5E7EB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#1F2937',
    borderLight: '#111827',
    chatBotBubble: '#0F172A',
    chatBotText: '#E5E7EB',
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const systemScheme = Appearance.getColorScheme();
  const resolvedScheme = resolveScheme(mode, systemScheme);

  const theme = useMemo(() => {
    return resolvedScheme === 'dark' ? buildDarkTheme(lightTheme) : lightTheme;
  }, [resolvedScheme]);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (!mounted) return;
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ mode, resolvedScheme, theme, shadows: lightShadows, setMode }),
    [mode, resolvedScheme, theme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

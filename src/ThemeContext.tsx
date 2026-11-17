import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadSettings, saveSettings } from './storage';
import { darkColors, lightColors, type ThemeColors } from './theme';

type ThemeContextValue = {
  colors: ThemeColors;
  darkMode: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const settings = await loadSettings();
        setDarkModeState(Boolean(settings.darkMode));
      } catch {
        setDarkModeState(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setDarkMode = useCallback(async (value: boolean) => {
    setDarkModeState(value);
    const settings = await loadSettings();
    await saveSettings({ ...settings, darkMode: value });
  }, []);

  const value = useMemo(
    () => ({
      colors: darkMode ? darkColors : lightColors,
      darkMode,
      setDarkMode,
      ready,
    }),
    [darkMode, ready, setDarkMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

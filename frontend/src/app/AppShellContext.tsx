import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface AppShellState {
  theme: Theme;
  toggleTheme: () => void;
  collapsed: boolean;
  toggleSidebar: () => void;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

const AppShellContext = createContext<AppShellState | null>(null);

function readStored<T extends string>(key: string, fallback: T): T {
  const stored = window.localStorage.getItem(key);
  return (stored as T) || fallback;
}

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStored('velo-theme', 'light'));
  const [collapsed, setCollapsed] = useState<boolean>(() => window.localStorage.getItem('velo-sidebar-collapsed') === 'true');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('velo-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-collapsed', String(collapsed));
    window.localStorage.setItem('velo-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value: AppShellState = {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    collapsed,
    toggleSidebar: () => setCollapsed((c) => !c),
    paletteOpen,
    openPalette: () => setPaletteOpen(true),
    closePalette: () => setPaletteOpen(false),
  };

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return ctx;
}

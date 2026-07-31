import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ThemeId = 'hunter' | 'azul' | 'berserker' | 'arcane' | 'nature' | 'minimal';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subtitle: string;
  icon: string;
  primaryHsl: string;
  accentHsl: string;
  previewColors: [string, string, string]; // primary, accent, bg
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'hunter',
    name: 'Laranja',
    subtitle: 'Padrão',
    icon: '🟠',
    primaryHsl: '38 95% 55%',
    accentHsl: '30 100% 60%',
    previewColors: ['hsl(38 95% 55%)', 'hsl(30 100% 60%)', 'hsl(0 0% 3%)'],
  },
  {
    id: 'azul',
    name: 'Azul',
    subtitle: 'Hunter Neon',
    icon: '🔵',
    primaryHsl: '210 100% 55%',
    accentHsl: '195 100% 60%',
    previewColors: ['hsl(210 100% 55%)', 'hsl(195 100% 60%)', 'hsl(220 20% 4%)'],
  },
  {
    id: 'berserker',
    name: 'Vermelho',
    subtitle: 'Berserker',
    icon: '🔴',
    primaryHsl: '0 80% 55%',
    accentHsl: '15 90% 55%',
    previewColors: ['hsl(0 80% 55%)', 'hsl(15 90% 55%)', 'hsl(0 15% 5%)'],
  },
  {
    id: 'arcane',
    name: 'Roxo',
    subtitle: 'Arcano',
    icon: '🟣',
    primaryHsl: '270 70% 60%',
    accentHsl: '285 80% 65%',
    previewColors: ['hsl(270 70% 60%)', 'hsl(285 80% 65%)', 'hsl(270 20% 5%)'],
  },
  {
    id: 'nature',
    name: 'Verde',
    subtitle: 'Nature',
    icon: '🟢',
    primaryHsl: '145 70% 45%',
    accentHsl: '160 80% 50%',
    previewColors: ['hsl(145 70% 45%)', 'hsl(160 80% 50%)', 'hsl(150 20% 4%)'],
  },
  {
    id: 'minimal',
    name: 'Cinza',
    subtitle: 'Minimal',
    icon: '⚪',
    primaryHsl: '220 15% 55%',
    accentHsl: '220 10% 65%',
    previewColors: ['hsl(220 15% 55%)', 'hsl(220 10% 65%)', 'hsl(220 10% 4%)'],
  },
];

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as ThemeId) || 'hunter';
  });

  const applyTheme = useCallback((id: ThemeId) => {
    document.documentElement.setAttribute('data-theme', id);
  }, []);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  const setTheme = useCallback((id: ThemeId) => {
    setCurrentTheme(id);
    localStorage.setItem('app_theme', id);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

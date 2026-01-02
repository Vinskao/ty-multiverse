// src/components/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始化時從 DOM 讀取主題（避免與內聯腳本衝突）
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // 優先從 DOM 讀取（由內聯腳本設置），確保與頁面初始狀態一致
      const isDark = document.documentElement.classList.contains('theme-dark');
      if (isDark) return 'dark';
      
      const isLight = document.documentElement.classList.contains('theme-light');
      if (isLight) return 'light';
      
      // 備用：從 localStorage 讀取
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) return savedTheme;
      
      // 最終備用：系統偏好
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // 監聽系統主題變化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用戶未手動設置主題時，才跟隨系統變化
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 應用主題到 document（僅在主題變更時執行，避免不必要的 DOM 操作）
  useEffect(() => {
    const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
    
    // 只有在主題真的需要變更時才更新 DOM
    if (currentTheme !== theme) {
      document.documentElement.classList.remove('theme-light', 'theme-dark');
      document.documentElement.classList.add(`theme-${theme}`);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // SSR 或是沒有 Provider 時的安全回退
    return {
      theme: 'light' as Theme,
      toggleTheme: () => { }
    };
  }
  return context;
}
// src/components/ThemeToggle.tsx
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function ThemeToggle() {
  // 初始化狀態，確保服務器和客戶端初始渲染一致
  // 初始值設為 null 或 undefined，表示尚未確定
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // 組件掛載後，再從 localStorage 和 prefers-color-scheme 確定主題
    const initialTheme = (() => {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') === 'dark';
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }
      return false; // 默認為 light
    })();
    setIsDark(initialTheme);
    // 根據確定的主題更新 class
    document.documentElement.classList.toggle('theme-dark', initialTheme);

    // 監聽系統主題變化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用戶未手動設置主題時才跟隨系統
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('theme-dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []); // 空依賴數組，確保只在掛載時執行一次初始檢測

  const toggleTheme = () => {
    // 只有在 isDark 確定後才允許切換
    if (isDark === null) return;

    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('theme-dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  // 在狀態未確定時，可以選擇渲染 null 或一個佔位符，
  // 或者渲染一個默認狀態（例如 light），只要它與服務器渲染一致
  if (isDark === null) {
    // 選擇渲染一個與服務器端一致的默認狀態 (假設服務器默認 light)
    // 或者返回 null 避免渲染不一致的內容
    // return null; // 如果選擇不渲染直到狀態確定

    // 渲染一個默認狀態（假設服務器默認渲染 light theme）
    // 注意：這裡的 aria-pressed 和 className 需要與服務器渲染的默認值匹配
    return (
      <div className="theme-toggle">
        <button onClick={toggleTheme} aria-pressed={false} disabled> 
          <span className="sr-only">Dark theme</span>
          <span className={`icon light active`}> 
            <Icon icon="sun" />
          </span>
          <span className={`icon dark `}> 
            <Icon icon="moon-stars" />
          </span>
        </button>
      </div>
    );
  }

  // 狀態確定後，正常渲染
  return (
    <div className="theme-toggle">
      <button onClick={toggleTheme} aria-pressed={isDark}>
        <span className="sr-only">Dark theme</span>
        <span className={`icon light ${isDark ? '' : 'active'}`}>
          <Icon icon="sun" />
        </span>
        <span className={`icon dark ${isDark ? 'active' : ''}`}>
          <Icon icon="moon-stars" />
        </span>
      </button>
    </div>
  );
}
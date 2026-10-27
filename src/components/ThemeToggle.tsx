// src/components/ThemeToggle.tsx
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';
  const label = '切換明暗主題 / Toggle light and dark theme';

  return (
    <div className={`theme-toggle ${mounted ? 'hydrated' : ''}`}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleTheme();
        }}
        aria-pressed={mounted ? isDark : false}
        aria-label={label}
        title={label}
      >
        {/* Black-and-white half-moon: a white disc with its left half black. It turns over in the dark theme. */}
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9.25" fill="#fff" stroke="#8e8e93" strokeWidth="1" />
          <path d="M12 2.75a9.25 9.25 0 0 0 0 18.5z" fill="#000" />
        </svg>
      </button>
    </div>
  );
}

// 導出組件：合包 Provider 與 Button，確保在 Astro 中作為單一 Island 水合
export function ThemeToggle() {
  return (
    <ThemeProvider>
      <ThemeButton />
    </ThemeProvider>
  );
}

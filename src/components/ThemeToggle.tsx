// src/components/ThemeToggle.tsx
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[ThemeToggle] Button clicked! Current theme:', theme);

    if (typeof toggleTheme === 'function') {
      try {
        toggleTheme();
        console.log('[ThemeToggle] Theme toggled successfully');
      } catch (error) {
        console.error('[ThemeToggle] Error toggling theme:', error);
      }
    } else {
      console.error('[ThemeToggle] toggleTheme is not a function:', toggleTheme);
    }
  };

  return (
    <div className={`theme-toggle ${mounted ? 'hydrated' : ''}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isDark}
        title="Toggle theme"
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      >
        <span className="sr-only">Dark theme</span>
        <span className="icon light">
          <Icon icon="sun" />
        </span>
        <span className="icon dark">
          <Icon icon="moon-stars" />
        </span>
      </button>

      <style>{`
        .theme-toggle .icon {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        /* CSS-driven visibility to prevent flash */
        :root:not(.theme-dark) .theme-toggle .icon.light {
          opacity: 1 !important;
        }
        :root.theme-dark .theme-toggle .icon.dark {
          opacity: 1 !important;
        }
      `}</style>
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
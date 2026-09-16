import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DEFAULT_SETTINGS } from './state/settingsDefaults';

// Initialize theme transition settings from localStorage before the app renders
try {
  const saved = window.localStorage.getItem('juicecut.settings.colorTransitionDuration');
  if (saved !== null) {
    const duration = Number(saved);
    document.documentElement.style.setProperty('--theme-transition-duration', `${duration}ms`);
  } else {
    document.documentElement.style.setProperty('--theme-transition-duration', `${DEFAULT_SETTINGS.colorTransitionDuration}ms`);
  }
  document.documentElement.style.setProperty('--theme-transition-timing', 'cubic-bezier(0.4, 0, 0.2, 1)');
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

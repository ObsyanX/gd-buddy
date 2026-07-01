import { useEffect, useState, useCallback } from 'react';
import en from './en.json';
import hi from './hi.json';
import es from './es.json';

export type Locale = 'en' | 'hi' | 'es';
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'es', label: 'Español' },
];

const CATALOGS: Record<Locale, Record<string, string>> = { en, hi, es };
const LOCAL_KEY = 'gdb.i18n.locale';

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored && stored in CATALOGS) return stored as Locale;
  } catch {}
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return (nav in CATALOGS ? nav : 'en') as Locale;
}

let currentLocale: Locale = detectLocale();
const listeners = new Set<(l: Locale) => void>();

export function setLocale(l: Locale) {
  currentLocale = l;
  try { localStorage.setItem(LOCAL_KEY, l); } catch {}
  document.documentElement.setAttribute('lang', l);
  listeners.forEach((fn) => fn(l));
}

export function getLocale(): Locale { return currentLocale; }

export function t(key: string, fallback?: string): string {
  return CATALOGS[currentLocale]?.[key] ?? CATALOGS.en[key] ?? fallback ?? key;
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(currentLocale);
  useEffect(() => {
    const fn = (l: Locale) => setLocaleState(l);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const translate = useCallback((key: string, fallback?: string) => t(key, fallback), [locale]);
  return { locale, setLocale, t: translate };
}

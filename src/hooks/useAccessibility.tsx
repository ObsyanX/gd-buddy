import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AccessibilityPrefs {
  captions: boolean;
  high_contrast: boolean;
  dyslexia_font: boolean;
  font_scale: number;
  timer_visibility: 'default' | 'hidden' | 'always';
  speech_rate: number;
  colorblind_palette: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  locale: string;
}

export const DEFAULT_PREFS: AccessibilityPrefs = {
  captions: false,
  high_contrast: false,
  dyslexia_font: false,
  font_scale: 1.0,
  timer_visibility: 'default',
  speech_rate: 1.0,
  colorblind_palette: 'default',
  locale: 'en',
};

const LOCAL_KEY = 'gdb.a11y.prefs';

function applyToDom(p: AccessibilityPrefs) {
  const root = document.documentElement;
  root.style.setProperty('--a11y-font-scale', String(p.font_scale));
  root.classList.toggle('a11y-high-contrast', p.high_contrast);
  root.classList.toggle('a11y-dyslexia', p.dyslexia_font);
  root.setAttribute('data-cb-palette', p.colorblind_palette);
  root.setAttribute('lang', p.locale);
}

export function useAccessibility() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_PREFS;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { applyToDom(prefs); }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data } = await supabase
        .from('accessibility_prefs')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const merged: AccessibilityPrefs = {
          captions: !!data.captions,
          high_contrast: !!data.high_contrast,
          dyslexia_font: !!data.dyslexia_font,
          font_scale: Number(data.font_scale ?? 1),
          timer_visibility: (data.timer_visibility as any) ?? 'default',
          speech_rate: Number(data.speech_rate ?? 1),
          colorblind_palette: (data.colorblind_palette as any) ?? 'default',
          locale: data.locale ?? 'en',
        };
        setPrefs(merged);
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(merged)); } catch {}
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (patch: Partial<AccessibilityPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('accessibility_prefs').upsert(
      { user_id: auth.user.id, ...patch },
      { onConflict: 'user_id' },
    );
  }, []);

  return { prefs, loading, update };
}

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { flush, installOfflineFlusher, peekAll } from '@/lib/offline-queue';
import { useI18n } from '@/i18n';

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    installOfflineFlusher();
    const onOnline = async () => {
      setOnline(true);
      setSyncing(true);
      await flush();
      setSyncing(false);
      setPending((await peekAll()).length);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    (async () => setPending((await peekAll()).length))();
    const iv = setInterval(async () => setPending((await peekAll()).length), 15000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(iv);
    };
  }, []);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md border-2 border-border bg-background/95 backdrop-blur shadow-lg flex items-center gap-2 text-sm"
    >
      {!online ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>{t('offline.banner')}</span>
          {pending > 0 && <span className="font-mono">({pending})</span>}
        </>
      ) : (
        <>
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{t('offline.syncing')}</span>
          {pending > 0 && <span className="font-mono">({pending})</span>}
        </>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { WifiOff, Download, RefreshCw, X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOfflineSnapshot() {
  return !navigator.onLine;
}

function getServerOfflineSnapshot() {
  return false;
}

export function ServiceWorkerRegister() {
  const { t } = useI18n();
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const isOffline = useSyncExternalStore(subscribeOnline, getOfflineSnapshot, getServerOfflineSnapshot);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  // Register Service Worker safely
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In local development, unregister any active service worker and purge caches
    // so Turbopack hot module reload never serves stale chunks.
    if (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    // Capture install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Register SW
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // If an updated worker is already waiting for an existing controlled page
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        // Listen for new worker installed and waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration skipped or failed:', err);
      });

    // Listen for controlling service worker change
    let hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        // First install: the page has become controlled for the first time. Do NOT reload!
        hadController = true;
        return;
      }
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleApplyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  }, [waitingWorker]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {/* 1. Offline Mode Alert Toast */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/90 text-slate-950 font-semibold text-xs shadow-2xl backdrop-blur-md border border-amber-300 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <WifiOff className="w-4 h-4" />
          <span>{t('offline.title')}</span>
        </aside>
      )}

      {/* 2. New Version Available Banner */}
      {updateAvailable && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/95 text-white text-xs shadow-2xl border border-blue-500/30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span className="font-medium">{t('pwa.updateAvailable')}</span>
          </div>
          <button
            onClick={handleApplyUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('pwa.refreshToUpdate')}</span>
          </button>
        </aside>
      )}

      {/* 3. Install PWA Prompt Banner */}
      {showInstallBanner && deferredPrompt && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-16 right-4 z-40 flex items-center gap-3 p-3.5 rounded-xl bg-[#09152b]/95 text-white text-xs shadow-2xl border border-white/10 backdrop-blur-md"
        >
          <span className="text-slate-300">{t('pwa.installPrompt')}</span>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('pwa.installButton')}</span>
          </button>
          <button
            onClick={() => setShowInstallBanner(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            aria-label={t('pwa.dismiss')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </>
  );
}

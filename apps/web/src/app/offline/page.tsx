"use client";

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WifiOff, RefreshCw, BookOpen, Trash2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { offlineStorage, type OfflineLessonItem } from '../../lib/offline-storage';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export default function OfflineFallbackPage() {
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<OfflineLessonItem | null>(null);

  const allSavedLessons = user?._id ? offlineStorage.getSavedLessons(user._id) : [];
  const savedLessons = allSavedLessons.filter((item) => !deletedIds.includes(item.id));

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleRemoveItem = (lessonId: string) => {
    if (user?._id) {
      offlineStorage.removeLesson(user._id, lessonId);
      setDeletedIds((prev) => [...prev, lessonId]);
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060E1A] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/eta-logo-dark.png"
            alt="ETA Logo"
            width={120}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('offline.offlineBadge')}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full my-auto py-12 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center shadow-xl shadow-blue-900/10">
          <WifiOff className="w-10 h-10 text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t('offline.title')}
          </h1>
          <p className="text-base text-slate-400 max-w-lg mx-auto">
            {t('offline.description')}
          </p>
        </div>

        {/* Connectivity Status Banner */}
        <div className="w-full max-w-md p-3 rounded-lg border border-white/10 bg-slate-900/60 text-xs flex items-center justify-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-slate-300">
            {isOnline ? t('offline.connectionRestored') : t('offline.requiresConnection')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('offline.retry')}</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 transition-all duration-200"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t('common.home')}</span>
          </Link>
        </div>

        {/* Offline Saved Educational Materials */}
        {user && savedLessons.length > 0 && (
          <div className="w-full mt-10 pt-8 border-t border-white/10 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>{t('offline.cachedContent')} ({savedLessons.length})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {savedLessons.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40 transition-all"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      {item.courseTitle}
                    </span>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{item.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setSelectedLesson(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition-all"
                    >
                      {t('common.view')}
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                      title={t('offline.removeOffline')}
                      aria-label={t('offline.removeOffline')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal for viewing selected offline lesson */}
        {selectedLesson && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0b1329] border border-white/15 rounded-2xl max-w-2xl w-full p-6 text-left max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
                <div>
                  <span className="text-xs text-blue-400 font-semibold uppercase">{selectedLesson.courseTitle}</span>
                  <h2 className="text-xl font-bold text-white">{selectedLesson.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {t('common.close')}
                </button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-4 text-sm text-slate-300 pr-2">
                <p className="font-medium text-slate-200">{selectedLesson.summary}</p>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 whitespace-pre-wrap leading-relaxed text-slate-300">
                  {selectedLesson.content}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exploratory Training Academy PWA</span>
        </div>
        <span>&copy; {new Date().getFullYear()} ETA. {t('common.status.active')}.</span>
      </footer>
    </div>
  );
}

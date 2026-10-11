"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  SupportedLocale,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  getLocaleDirection,
  isSupportedLocale,
  type LocaleDirection,
} from './config';
import { resolveTranslation } from './dictionaries';
import {
  formatDate as intlFormatDate,
  formatDateTime as intlFormatDateTime,
  formatNumber as intlFormatNumber,
  formatPercent as intlFormatPercent,
  formatCurrency as intlFormatCurrency,
  formatRelativeTime as intlFormatRelativeTime,
} from './formatters';
import { useAuth } from '../context/AuthContext';

export interface I18nContextType {
  locale: SupportedLocale;
  direction: LocaleDirection;
  isRTL: boolean;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (ratio: number, decimals?: number) => string;
  formatCurrency: (amountMinor: number, currency?: string) => string;
  formatRelativeTime: (date: Date | string | number, baseDate?: Date) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale }) => {
  const { user, status, updateProfile } = useAuth();

  // Explicit state overrides or fallback
  const [explicitLocale, setExplicitLocale] = useState<SupportedLocale | null>(null);

  // Compute effective locale: explicit user change > authenticated profile preference > initial SSR/cookie > default
  const effectiveLocale: SupportedLocale =
    explicitLocale ||
    (user?.preferredLanguage && isSupportedLocale(user.preferredLanguage)
      ? user.preferredLanguage
      : initialLocale && isSupportedLocale(initialLocale)
      ? initialLocale
      : DEFAULT_LOCALE);

  const direction = getLocaleDirection(effectiveLocale);
  const isRTL = direction === 'rtl';

  // Apply DOM HTML lang and dir attributes
  const applyDocumentAttributes = useCallback((loc: SupportedLocale) => {
    if (typeof document !== 'undefined') {
      const dir = getLocaleDirection(loc);
      document.documentElement.lang = loc;
      document.documentElement.dir = dir;
    }
  }, []);

  // Save locale to cookie and localStorage
  const persistLocale = useCallback((loc: SupportedLocale) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, loc);
      } catch {
        // ignore storage errors
      }
      try {
        // Cookie lasts 1 year, Lax SameSite
        document.cookie = `${LOCALE_COOKIE_NAME}=${loc};path=/;max-age=31536000;SameSite=Lax`;
      } catch {
        // ignore cookie errors
      }
    }
  }, []);

  // Sync document HTML attributes and persistence on effective locale change
  useEffect(() => {
    applyDocumentAttributes(effectiveLocale);
    persistLocale(effectiveLocale);
  }, [effectiveLocale, applyDocumentAttributes, persistLocale]);

  // Public setter for language switcher
  const setLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      if (!isSupportedLocale(newLocale)) return;

      setExplicitLocale(newLocale);
      applyDocumentAttributes(newLocale);
      persistLocale(newLocale);

      // If user is authenticated, persist to MongoDB backend profile
      if (status === 'authenticated' && user) {
        try {
          await updateProfile({ preferredLanguage: newLocale });
        } catch (err) {
          console.warn('Failed to persist preferredLanguage to user profile:', err);
        }
      }
    },
    [status, user, updateProfile, applyDocumentAttributes, persistLocale]
  );

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>) => {
      return resolveTranslation(effectiveLocale, keyPath, params);
    },
    [effectiveLocale]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return intlFormatDate(date, effectiveLocale, options, user?.timezone);
    },
    [effectiveLocale, user?.timezone]
  );

  const formatDateTime = useCallback(
    (date: Date | string | number) => {
      return intlFormatDateTime(date, effectiveLocale, user?.timezone);
    },
    [effectiveLocale, user?.timezone]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return intlFormatNumber(value, effectiveLocale, options);
    },
    [effectiveLocale]
  );

  const formatPercent = useCallback(
    (ratio: number, decimals?: number) => {
      return intlFormatPercent(ratio, effectiveLocale, decimals);
    },
    [effectiveLocale]
  );

  const formatCurrency = useCallback(
    (amountMinor: number, currency: string = 'SAR') => {
      return intlFormatCurrency(amountMinor, currency, effectiveLocale);
    },
    [effectiveLocale]
  );

  const formatRelativeTime = useCallback(
    (date: Date | string | number, baseDate?: Date) => {
      return intlFormatRelativeTime(date, effectiveLocale, baseDate);
    },
    [effectiveLocale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale: effectiveLocale,
        direction,
        isRTL,
        setLocale,
        t,
        formatDate,
        formatDateTime,
        formatNumber,
        formatPercent,
        formatCurrency,
        formatRelativeTime,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

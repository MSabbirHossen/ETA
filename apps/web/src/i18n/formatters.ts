import { SupportedLocale } from './config';

/**
 * Locale mapping for native Intl formatters
 */
const INTL_LOCALE_MAP: Record<SupportedLocale, string> = {
  [SupportedLocale.EN]: 'en-US',
  [SupportedLocale.BN]: 'bn-BD',
  [SupportedLocale.AR]: 'ar-SA',
};

export function getIntlLocale(locale: SupportedLocale): string {
  return INTL_LOCALE_MAP[locale] || 'en-US';
}

/**
 * Formats a timestamp/date into a localized string with optional timezone
 */
export function formatDate(
  dateInput: Date | string | number,
  locale: SupportedLocale = SupportedLocale.EN,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string
): string {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(timeZone ? { timeZone } : {}),
      ...options,
    };

    return new Intl.DateTimeFormat(getIntlLocale(locale), defaultOptions).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats date and time together
 */
export function formatDateTime(
  dateInput: Date | string | number,
  locale: SupportedLocale = SupportedLocale.EN,
  timeZone?: string
): string {
  return formatDate(
    dateInput,
    locale,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    timeZone
  );
}

/**
 * Localized number formatting
 */
export function formatNumber(
  value: number,
  locale: SupportedLocale = SupportedLocale.EN,
  options?: Intl.NumberFormatOptions
): string {
  try {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Localized percentage formatting
 */
export function formatPercent(
  ratio: number,
  locale: SupportedLocale = SupportedLocale.EN,
  decimals: number = 1
): string {
  try {
    // ratio typically 0.0 to 1.0 or 0 to 100
    const normalized = ratio > 1 ? ratio / 100 : ratio;
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(normalized);
  } catch {
    return `${ratio}%`;
  }
}

/**
 * Localized currency formatting from minor units (cents/paisa/halalas).
 * PRD §45: Authoritative stored value remains integer minor units.
 */
export function formatCurrency(
  amountMinor: number,
  currency: string = 'SAR',
  locale: SupportedLocale = SupportedLocale.EN
): string {
  try {
    const major = (amountMinor || 0) / 100;
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${(amountMinor / 100).toFixed(2)}`;
  }
}

/**
 * Localized relative time formatter (e.g., "5 minutes ago", "in 2 days")
 */
export function formatRelativeTime(
  dateInput: Date | string | number,
  locale: SupportedLocale = SupportedLocale.EN,
  baseDate: Date = new Date()
): string {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const diffInSeconds = Math.round((date.getTime() - baseDate.getTime()) / 1000);
    const absSeconds = Math.abs(diffInSeconds);

    const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), { numeric: 'auto' });

    if (absSeconds < 60) {
      return rtf.format(diffInSeconds, 'second');
    }
    const diffInMinutes = Math.round(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(diffInMinutes, 'minute');
    }
    const diffInHours = Math.round(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
      return rtf.format(diffInHours, 'hour');
    }
    const diffInDays = Math.round(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) {
      return rtf.format(diffInDays, 'day');
    }
    const diffInMonths = Math.round(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) {
      return rtf.format(diffInMonths, 'month');
    }
    const diffInYears = Math.round(diffInDays / 365);
    return rtf.format(diffInYears, 'year');
  } catch {
    return formatDate(dateInput, locale);
  }
}

import { SupportedLocale, type LocaleDirection } from '@eta/types';

export { SupportedLocale };
export type { LocaleDirection };

export const DEFAULT_LOCALE = SupportedLocale.EN;
export const LOCALE_COOKIE_NAME = 'eta_locale';
export const LOCALE_STORAGE_KEY = 'eta_locale';

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  SupportedLocale.EN,
  SupportedLocale.BN,
  SupportedLocale.AR,
];

export const LOCALE_DIRECTIONS: Record<SupportedLocale, LocaleDirection> = {
  [SupportedLocale.EN]: 'ltr',
  [SupportedLocale.BN]: 'ltr',
  [SupportedLocale.AR]: 'rtl',
};

export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
  direction: LocaleDirection;
}

export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  [SupportedLocale.EN]: {
    code: SupportedLocale.EN,
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    direction: 'ltr',
  },
  [SupportedLocale.BN]: {
    code: SupportedLocale.BN,
    name: 'Bangla',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    direction: 'ltr',
  },
  [SupportedLocale.AR]: {
    code: SupportedLocale.AR,
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl',
  },
};

export function isSupportedLocale(val: unknown): val is SupportedLocale {
  return typeof val === 'string' && (val === 'en' || val === 'bn' || val === 'ar');
}

export function getLocaleDirection(locale: SupportedLocale): LocaleDirection {
  return LOCALE_DIRECTIONS[locale] || 'ltr';
}

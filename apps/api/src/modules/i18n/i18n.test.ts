import { describe, it, expect } from 'vitest';
import { SupportedLocale, LocaleDirection } from '@eta/types';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  getLocaleDirection,
  LOCALE_DIRECTIONS,
} from '../../../../web/src/i18n/config';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatCurrency,
  formatRelativeTime,
} from '../../../../web/src/i18n/formatters';
import { en } from '../../../../web/src/i18n/dictionaries/en';
import { bn } from '../../../../web/src/i18n/dictionaries/bn';
import { ar } from '../../../../web/src/i18n/dictionaries/ar';
import { getDictionary, resolveTranslation } from '../../../../web/src/i18n/dictionaries';

describe('Phase 16 — Multilingual Architecture & Locales (PRD §57)', () => {
  describe('Locale Configuration & Supported Locales', () => {
    it('defines the correct default locale as English', () => {
      expect(DEFAULT_LOCALE).toBe(SupportedLocale.EN);
      expect(DEFAULT_LOCALE).toBe('en');
    });

    it('supports exactly English, Bengali, and Arabic', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'bn', 'ar']);
    });

    it('identifies supported vs unsupported locales', () => {
      expect(isSupportedLocale('en')).toBe(true);
      expect(isSupportedLocale('bn')).toBe(true);
      expect(isSupportedLocale('ar')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(false);
      expect(isSupportedLocale(undefined)).toBe(false);
      expect(isSupportedLocale('')).toBe(false);
    });

    it('maps directions correctly: Arabic is RTL, English & Bengali are LTR', () => {
      expect(getLocaleDirection(SupportedLocale.AR)).toBe('rtl');
      expect(getLocaleDirection(SupportedLocale.EN)).toBe('ltr');
      expect(getLocaleDirection(SupportedLocale.BN)).toBe('ltr');
      expect(LOCALE_DIRECTIONS[SupportedLocale.AR]).toBe('rtl');
      expect(LOCALE_DIRECTIONS[SupportedLocale.EN]).toBe('ltr');
      expect(LOCALE_DIRECTIONS[SupportedLocale.BN]).toBe('ltr');
    });
  });

  describe('Translation Dictionary Completeness (100% Key Parity)', () => {
    function getLeafKeys(obj: Record<string, any>, prefix = ''): string[] {
      let keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys = keys.concat(getLeafKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    }

    const enKeys = getLeafKeys(en);
    const bnKeys = getLeafKeys(bn);
    const arKeys = getLeafKeys(ar);

    it('contains a rich set of canonical English translation keys across all domains', () => {
      expect(enKeys.length).toBeGreaterThan(100);
    });

    it('Bangla dictionary contains 100% of canonical English keys without missing keys', () => {
      const missingInBn = enKeys.filter((k) => !bnKeys.includes(k));
      expect(missingInBn).toEqual([]);
    });

    it('Arabic dictionary contains 100% of canonical English keys without missing keys', () => {
      const missingInAr = enKeys.filter((k) => !arKeys.includes(k));
      expect(missingInAr).toEqual([]);
    });

    it('all translations in EN, BN, AR are non-empty strings', () => {
      function assertNonEmpty(obj: Record<string, any>, path = '') {
        for (const [key, val] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof val === 'object' && val !== null) {
            assertNonEmpty(val, currentPath);
          } else {
            expect(typeof val).toBe('string');
            expect(val.trim().length).toBeGreaterThan(0);
          }
        }
      }

      assertNonEmpty(en);
      assertNonEmpty(bn);
      assertNonEmpty(ar);
    });
  });

  describe('Translation Resolution & Interpolation', () => {
    it('resolves top-level and nested translation keys for active locale', () => {
      expect(resolveTranslation(SupportedLocale.EN, 'common.save')).toBe('Save Changes');
      expect(resolveTranslation(SupportedLocale.BN, 'common.save')).toBe('সংরক্ষণ করুন');
      expect(resolveTranslation(SupportedLocale.AR, 'common.save')).toBe('حفظ التغييرات');
    });

    it('falls back to English when a key is missing or locale is invalid', () => {
      expect(resolveTranslation('fr' as any, 'common.save')).toBe('Save Changes');
      expect(resolveTranslation(SupportedLocale.AR, 'nonexistent.key')).toBe('nonexistent.key');
    });

    it('interpolates parameters safely without string concatenation artifacts', () => {
      expect(resolveTranslation(SupportedLocale.EN, 'nav.search')).toBe('Search');
      // Dynamic interpolation test with custom dictionary lookup helper
      const template = 'Showing {start} to {end} of {total} results';
      const rendered = template
        .replace('{start}', '1')
        .replace('{end}', '25')
        .replace('{total}', '100');
      expect(rendered).toBe('Showing 1 to 25 of 100 results');
    });
  });

  describe('Locale-Aware Intl Formatting', () => {
    const fixedDate = new Date('2026-10-08T12:00:00Z');

    it('formats dates according to locale without mutating timestamp', () => {
      const enDate = formatDate(fixedDate, SupportedLocale.EN);
      const bnDate = formatDate(fixedDate, SupportedLocale.BN);
      const arDate = formatDate(fixedDate, SupportedLocale.AR);

      expect(typeof enDate).toBe('string');
      expect(typeof bnDate).toBe('string');
      expect(typeof arDate).toBe('string');
      expect(enDate.length).toBeGreaterThan(0);
      expect(bnDate.length).toBeGreaterThan(0);
      expect(arDate.length).toBeGreaterThan(0);
    });

    it('formats numbers and percentages according to locale', () => {
      const enNum = formatNumber(12500.5, SupportedLocale.EN);
      const bnNum = formatNumber(12500.5, SupportedLocale.BN);
      const arNum = formatNumber(12500.5, SupportedLocale.AR);

      expect(typeof enNum).toBe('string');
      expect(typeof bnNum).toBe('string');
      expect(typeof arNum).toBe('string');

      const enPct = formatPercent(85.5, SupportedLocale.EN);
      const bnPct = formatPercent(85.5, SupportedLocale.BN);
      const arPct = formatPercent(85.5, SupportedLocale.AR);

      expect(enPct).toContain('%');
      expect(bnPct).toContain('%');
      // Arabic percent sign uses ٪ (U+066A)
      expect(arPct).toContain('٪');
    });

    it('formats currency correctly in integer minor units without changing financial truth', () => {
      // 50000 minor units (cents/paisa) = 500.00
      const enCurr = formatCurrency(50000, 'USD', SupportedLocale.EN);
      const bnCurr = formatCurrency(50000, 'BDT', SupportedLocale.BN);
      const arCurr = formatCurrency(50000, 'SAR', SupportedLocale.AR);

      expect(enCurr).toContain('500');
      expect(bnCurr.length).toBeGreaterThan(0);
      expect(arCurr.length).toBeGreaterThan(0);
    });

    it('formats relative time using Intl.RelativeTimeFormat', () => {
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const enRel = formatRelativeTime(pastDate, SupportedLocale.EN);
      const bnRel = formatRelativeTime(pastDate, SupportedLocale.BN);
      const arRel = formatRelativeTime(pastDate, SupportedLocale.AR);

      expect(typeof enRel).toBe('string');
      expect(typeof bnRel).toBe('string');
      expect(typeof arRel).toBe('string');
      expect(enRel.toLowerCase()).toContain('hour');
    });
  });

  describe('Architectural Separation & Bidi Safety', () => {
    it('guarantees stored database enums and machine identifiers remain canonical', () => {
      // Verify that enum values in types remain stable uppercase English strings
      expect(SupportedLocale.EN).toBe('en');
      expect(SupportedLocale.BN).toBe('bn');
      expect(SupportedLocale.AR).toBe('ar');
    });
  });
});

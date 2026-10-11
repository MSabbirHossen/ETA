import { SupportedLocale } from '../config';
import type { TranslationDictionary } from '../types';
import { en } from './en';
import { bn } from './bn';
import { ar } from './ar';

export { en, bn, ar };

export const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  [SupportedLocale.EN]: en,
  [SupportedLocale.BN]: bn,
  [SupportedLocale.AR]: ar,
};

export function getDictionary(locale: SupportedLocale): TranslationDictionary {
  return dictionaries[locale] || dictionaries[SupportedLocale.EN];
}

/**
 * Resolves a nested key (e.g. "common.save", "audit.tableHeaders.timestamp")
 * with automatic fallback to English, and safe variable interpolation.
 */
export function resolveTranslation(
  locale: SupportedLocale,
  keyPath: string,
  params?: Record<string, string | number>
): string {
  const activeDict = getDictionary(locale);
  const fallbackDict = dictionaries[SupportedLocale.EN];

  const getValue = (dict: unknown, path: string): string | undefined => {
    const segments = path.split('.');
    let curr: unknown = dict;
    for (const seg of segments) {
      if (curr && typeof curr === 'object' && seg in (curr as Record<string, unknown>)) {
        curr = (curr as Record<string, unknown>)[seg];
      } else {
        return undefined;
      }
    }
    return typeof curr === 'string' ? curr : undefined;
  };

  let template = getValue(activeDict, keyPath);
  if (template === undefined) {
    template = getValue(fallbackDict, keyPath);
  }

  if (template === undefined) {
    return keyPath;
  }

  if (params) {
    return template.replace(/\{(\w+)\}/g, (_, match) => {
      return match in params ? String(params[match]) : `{${match}}`;
    });
  }

  return template;
}

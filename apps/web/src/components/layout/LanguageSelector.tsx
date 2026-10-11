"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n, SupportedLocale, LOCALE_METADATA, SUPPORTED_LOCALES } from '../../i18n';

export interface LanguageSelectorProps {
  variant?: 'header' | 'compact' | 'footer';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { locale, setLocale, isRTL } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMeta = LOCALE_METADATA[locale] || LOCALE_METADATA[SupportedLocale.EN];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (loc: SupportedLocale) => {
    setIsOpen(false);
    if (loc !== locale) {
      await setLocale(loc);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-start ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select language. Current language: ${currentMeta.nativeName}`}
        className={`flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#081324] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-[#16C4FF]/40 hover:bg-[#0A1B33] hover:text-white ${
          variant === 'compact' ? 'px-2 py-1' : ''
        }`}
      >
        <Globe className="h-3.5 w-3.5 text-[#16C4FF]" />
        <span className="font-sans text-xs">{currentMeta.nativeName}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available Languages"
          className={`absolute z-50 mt-1.5 w-44 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.98)] border border-[#16C4FF]/35 bg-[#060F1E] ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100 ${
            isRTL ? 'left-0' : 'right-0'
          }`}
        >
          {SUPPORTED_LOCALES.map((loc) => {
            const meta = LOCALE_METADATA[loc];
            const isSelected = loc === locale;
            return (
              <button
                key={loc}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(loc)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#073C84] to-[#0B7CEB] text-white shadow-sm ring-1 ring-[#16C4FF]/40'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{meta.flag}</span>
                  <span className="font-sans">{meta.nativeName}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#16C4FF]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

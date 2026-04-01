'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage, type AppLanguage } from '@/contexts/LanguageContext';

const LANG_LABELS: Record<AppLanguage, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'AR',
};

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const current = LANG_LABELS[language];

  return (
    <div ref={panelRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group px-3 py-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        aria-label="Change language"
      >
        <span className="font-bold text-gray-800 text-xs">{current}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-44 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[999]">
          <button
            type="button"
            onClick={() => {
              setLanguage('ar');
              setOpen(false);
            }}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
              language === 'ar' ? 'bg-gray-50' : ''
            }`}
          >
            <span className="text-gray-800 font-semibold">العربية</span>
            {language === 'ar' && <span className="text-teal-600 font-bold">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setOpen(false);
            }}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
              language === 'en' ? 'bg-gray-50' : ''
            }`}
          >
            <span className="text-gray-800 font-semibold">English</span>
            {language === 'en' && <span className="text-teal-600 font-bold">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('fr');
              setOpen(false);
            }}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
              language === 'fr' ? 'bg-gray-50' : ''
            }`}
          >
            <span className="text-gray-800 font-semibold">Français</span>
            {language === 'fr' && <span className="text-teal-600 font-bold">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}


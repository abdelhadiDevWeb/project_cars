'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'fr' | 'en' | 'ar';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('fr');

  // Initialize language from localStorage (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en' || stored === 'ar') {
        setLanguageState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist and apply to <html dir/lang>
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }

    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.lang = language === 'ar' ? 'ar' : language;
      html.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}


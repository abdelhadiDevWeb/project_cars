'use client';

import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function GlobalLanguageSwitcher() {
  const pathname = usePathname();

  if (pathname?.startsWith('/dashboard-admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      <LanguageSwitcher />
    </div>
  );
}

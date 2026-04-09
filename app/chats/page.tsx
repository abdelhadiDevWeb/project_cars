import { Suspense } from 'react';
import ChatsPageClient from './ChatsPageClient';

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ChatsPageClient />
    </Suspense>
  );
}

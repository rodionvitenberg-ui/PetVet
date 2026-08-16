'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

export default function FooterWrapper() {
  const pathname = usePathname();

  // Footer скрыт только на странице чата с ИИ.
  if (pathname === '/dashboard/ai-chat') return null;

  return <Footer />;
}
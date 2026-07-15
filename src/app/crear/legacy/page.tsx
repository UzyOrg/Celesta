import type { Metadata } from 'next';
import { CrearLessonPlayer } from '@/components/crear/CrearLessonPlayer';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CrearLegacyPage() {
  return <CrearLessonPlayer />;
}

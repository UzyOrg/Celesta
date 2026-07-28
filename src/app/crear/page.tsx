import { CinematicEnglishPlayer } from '@/components/crear/v2/CinematicEnglishPlayer';

export default function CrearPage() {
  return (
    <>
      <link
        as="video"
        fetchPriority="high"
        href="/video/bg_waves.mp4"
        rel="preload"
        type="video/mp4"
      />
      <CinematicEnglishPlayer />
    </>
  );
}

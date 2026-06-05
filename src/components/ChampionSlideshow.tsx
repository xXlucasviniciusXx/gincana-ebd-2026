import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GalleryItem } from '@/services/gallery.service';

/**
 * Carrossel automático das fotos da galeria da equipe campeã,
 * com crossfade entre as imagens e indicadores clicáveis.
 */
export default function ChampionSlideshow({ images }: { images: GalleryItem[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl">
      <p className="text-xs uppercase tracking-widest opacity-70 mb-3">
        📸 Momentos da campeã
      </p>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black/20 shadow-glow ring-1 ring-white/20">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={current.id}
            src={current.image_url}
            alt={current.caption ?? ''}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        {current.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
            <p className="text-sm text-white drop-shadow">{current.caption}</p>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Ir para a foto ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

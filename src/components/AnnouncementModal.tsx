import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { announcementsService } from '@/services/announcements.service';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { AnnouncementRow, AnnouncementVariant } from '@/lib/database.types';

const VARIANT_META: Record<
  AnnouncementVariant,
  {
    emoji: string;
    accent: string;
    ring: string;
    button: string;
  }
> = {
  info: {
    emoji: '📢',
    accent: 'from-brand-teal to-brand-navy-light',
    ring: 'ring-brand-teal/30',
    button: 'btn-teal',
  },
  success: {
    emoji: '✅',
    accent: 'from-emerald-500 to-brand-teal',
    ring: 'ring-emerald-300/50',
    button: 'btn-teal',
  },
  warning: {
    emoji: '⚠️',
    accent: 'from-amber-400 to-brand-orange',
    ring: 'ring-amber-300/60',
    button: 'btn-accent',
  },
  urgent: {
    emoji: '🚨',
    accent: 'from-brand-red to-rose-700',
    ring: 'ring-red-300/60',
    button: 'btn-danger',
  },
};

function metaFor(v: string) {
  return VARIANT_META[v as AnnouncementVariant] ?? VARIANT_META.info;
}

const DISMISS_PREFIX = 'gincana:dismissed-ann:';

function wasDismissed(id: string): boolean {
  try {
    return sessionStorage.getItem(DISMISS_PREFIX + id) === '1';
  } catch {
    return false;
  }
}
function markDismissed(id: string): void {
  try {
    sessionStorage.setItem(DISMISS_PREFIX + id, '1');
  } catch {
    /* ignora */
  }
}

export default function AnnouncementModal() {
  const [ann, setAnn] = useState<AnnouncementRow | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const current = await announcementsService.getActive();
      setAnn(current);
      if (current && !wasDismissed(current.id)) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch {
      /* sem aviso ou tabela inexistente — silencioso */
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Aviso novo / editado dispara recarga em todas as abas abertas
  useRealtimeTable('announcements', load);

  function dismiss() {
    if (ann) markDismissed(ann.id);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && ann && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-title"
        >
          <motion.article
            key="card"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className={`relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-glow ring-4 ${metaFor(ann.variant).ring}`}
          >
            {/* Faixa colorida no topo */}
            <div
              className={`h-2 bg-gradient-to-r ${metaFor(ann.variant).accent}`}
              aria-hidden
            />
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fechar aviso"
              className="absolute top-3 right-3 rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200"
            >
              ✕
            </button>

            <div className="px-6 pt-6 pb-5 space-y-3">
              <div className="text-5xl text-center">{metaFor(ann.variant).emoji}</div>
              <h2
                id="announcement-title"
                className="heading-display text-2xl font-bold text-brand-navy text-center"
              >
                {ann.title}
              </h2>
              {ann.body && (
                <p className="text-slate-600 text-center whitespace-pre-line">
                  {ann.body}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-3 flex justify-center">
              <button
                type="button"
                onClick={dismiss}
                className={`${metaFor(ann.variant).button} min-w-[140px]`}
              >
                Entendi
              </button>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

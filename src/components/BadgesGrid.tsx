import { motion } from 'framer-motion';
import { decorateBadge } from '@/services/badges.service';
import type { TeamBadgeRow } from '@/lib/database.types';

type Props = {
  badges: TeamBadgeRow[];
  size?: 'sm' | 'md';
};

export default function BadgesGrid({ badges, size = 'md' }: Props) {
  if (badges.length === 0) return null;

  const resolved = badges
    .map(decorateBadge)
    .filter((b): b is NonNullable<ReturnType<typeof decorateBadge>> => b !== null);

  const sizing =
    size === 'sm'
      ? 'h-12 w-12 text-lg'
      : 'h-16 w-16 text-2xl';

  return (
    <div className="flex flex-wrap gap-3">
      {resolved.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 250 }}
          className="group relative"
        >
          <div
            className={`flex ${sizing} items-center justify-center rounded-2xl bg-gradient-to-br ${b.meta.color} text-white shadow-card`}
            title={`${b.meta.title} — ${b.meta.description}`}
          >
            {b.meta.emoji}
          </div>
          <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-44 -translate-x-1/2 rounded-lg bg-brand-navy px-2 py-1.5 text-center text-[10px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <strong className="block text-xs">{b.meta.title}</strong>
            <span className="opacity-80">{b.meta.description}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

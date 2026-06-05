import { motion } from 'framer-motion';
import type { TeamRanking } from '@/lib/database.types';

type Prize = {
  place: number;
  emoji: string;
  label: string;
  accent: string;
  ring: string;
  podiumClass: string;
  items: string[];
};

// Premiações da gincana. Por enquanto fixas no código — os locais
// ainda não foram definidos, então exibimos apenas a descrição dos prêmios.
const PRIZES: Prize[] = [
  {
    place: 1,
    emoji: '🥇',
    label: '1º Lugar',
    accent: '#f5b921',
    ring: 'ring-amber-300',
    podiumClass: 'md:order-2 md:-mt-6 md:scale-105 z-10',
    items: [
      'Troféu',
      'Medalhas para os participantes da equipe',
      'Certificado de participação',
      'Momento de lazer para todo o grupo',
    ],
  },
  {
    place: 2,
    emoji: '🥈',
    label: '2º Lugar',
    accent: '#94a3b8',
    ring: 'ring-slate-300',
    podiumClass: 'md:order-1',
    items: [
      'Medalhas para os participantes da equipe',
      'Certificado de participação',
      'Vale-pizza para o grupo',
    ],
  },
  {
    place: 3,
    emoji: '🥉',
    label: '3º Lugar',
    accent: '#cd7f32',
    ring: 'ring-orange-300',
    podiumClass: 'md:order-3',
    items: [
      'Medalhas para os participantes da equipe',
      'Certificado de participação',
    ],
  },
];

export default function PrizesPodium({
  top3,
  title = 'Premiações',
  subtitle,
}: {
  top3?: TeamRanking[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="space-y-5">
      <div className="text-center">
        <h2 className="heading-display text-2xl font-bold text-brand-navy">
          🎁 {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:items-end">
        {PRIZES.map((prize, i) => {
          const team = top3?.[prize.place - 1];
          const isFirst = prize.place === 1;
          return (
            <motion.div
              key={prize.place}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className={`card relative overflow-hidden ring-2 ${prize.ring} ${prize.podiumClass}`}
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundColor: prize.accent }}
              />
              <div className="text-center">
                <div className={isFirst ? 'text-5xl' : 'text-4xl'}>{prize.emoji}</div>
                <p className="heading-display text-lg font-bold text-brand-navy mt-1">
                  {prize.label}
                </p>
                {team ? (
                  <div
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: team.color }}
                  >
                    🏆 {team.name} · {team.total_points} pts
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Equipe a definir</p>
                )}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {prize.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-brand-teal">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

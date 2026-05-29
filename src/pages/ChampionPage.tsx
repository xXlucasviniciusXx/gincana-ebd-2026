import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { competitionService } from '@/services/competition.service';
import { teamsService } from '@/services/teams.service';
import { membersService } from '@/services/members.service';
import { rankingService } from '@/services/ranking.service';
import ShareButtons from '@/components/ShareButtons';
import type {
  CompetitionSettings,
  Team,
  Member,
  TeamRanking,
} from '@/lib/database.types';

const confettiColors = ['#f5b921', '#ef6a36', '#2ea3a5', '#c0392b', '#0b1f4d'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 3,
        color: confettiColors[i % confettiColors.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 8,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.4,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function ChampionPage() {
  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [champion, setChampion] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<TeamRanking[]>([]);
  const [championPoints, setChampionPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [s, ranking] = await Promise.all([
          competitionService.get(),
          rankingService.list(),
        ]);
        if (cancelled) return;
        setSettings(s);

        if (s?.champion_team_id) {
          const [t, m] = await Promise.all([
            teamsService.getById(s.champion_team_id),
            membersService.listByTeam(s.champion_team_id),
          ]);
          if (cancelled) return;
          setChampion(t);
          setMembers(m);
          setChampionPoints(
            ranking.find((r) => r.id === s.champion_team_id)?.total_points ?? 0,
          );
        } else if (s?.has_tie) {
          const ls = await rankingService.leaders();
          if (!cancelled) setLeaders(ls);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-slate-500">Carregando...</p>;

  if (!settings || settings.status !== 'closed') {
    return (
      <div className="card text-center space-y-3">
        <h1 className="heading-display text-2xl font-bold text-brand-navy">
          Gincana em andamento
        </h1>
        <p className="text-slate-600">
          A campeã ainda não foi definida. Confira o ranking ao vivo!
        </p>
        <Link to="/" className="btn-primary mx-auto">
          Ver ranking
        </Link>
      </div>
    );
  }

  if (settings.has_tie) {
    return (
      <div className="card text-center space-y-4">
        <div className="text-5xl">⚖️</div>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">
          Empate na liderança!
        </h1>
        <p className="text-slate-600 max-w-md mx-auto">
          A gincana foi encerrada com empate. Uma atividade de desempate será realizada.
        </p>
        {settings.tiebreaker_note && (
          <p className="text-sm text-slate-500 italic">{settings.tiebreaker_note}</p>
        )}
        <ul className="flex justify-center gap-3 flex-wrap">
          {leaders.map((l) => (
            <li
              key={l.id}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-card border-2"
              style={{ borderColor: l.color }}
            >
              {l.name} — {l.total_points} pts
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (champion) {
    return (
      <div className="relative">
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center text-white shadow-glow"
          style={{ background: `linear-gradient(135deg, ${champion.color}, #0b1f4d)` }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl mb-2"
          >
            🏆
          </motion.div>
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">Equipe campeã</p>
          <h1 className="heading-display text-4xl md:text-6xl font-extrabold mt-2 drop-shadow">
            {champion.name}
          </h1>
          {champion.theme_verse && (
            <p className="mt-3 text-lg italic opacity-90">"{champion.theme_verse}"</p>
          )}
          {champion.bible_reference && (
            <p className="text-sm opacity-70">— {champion.bible_reference}</p>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 inline-flex items-baseline gap-2 rounded-full bg-white/10 px-6 py-2 backdrop-blur"
          >
            <span className="text-3xl font-bold">{championPoints}</span>
            <span className="text-sm opacity-80">pontos finais</span>
          </motion.div>

          <div className="mt-6 flex justify-center">
            <ShareButtons
              title={`🏆 ${champion.name} é a Campeã da Gincana EBD 2026!`}
              text={`🏆 ${champion.name} venceu a Gincana EBD 2026 com ${championPoints} pts!`}
              className="justify-center"
            />
          </div>

          {members.length > 0 && (
            <div className="mt-8">
              <p className="text-xs uppercase tracking-widest opacity-70 mb-3">Integrantes</p>
              <div className="flex flex-wrap justify-center gap-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur"
                  >
                    {m.photo_url ? (
                      <img
                        src={m.photo_url}
                        alt={m.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-white/40"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center font-bold">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}

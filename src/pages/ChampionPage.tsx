import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { competitionService } from '@/services/competition.service';
import { teamsService } from '@/services/teams.service';
import { membersService } from '@/services/members.service';
import { rankingService } from '@/services/ranking.service';
import { galleryService, type GalleryItem } from '@/services/gallery.service';
import ShareButtons from '@/components/ShareButtons';
import Fireworks from '@/components/Fireworks';
import ChampionSlideshow from '@/components/ChampionSlideshow';
import PrizesPodium from '@/components/PrizesPodium';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import {
  isCelebrationPlaying,
  onCelebrationToggle,
  startCelebrationMusic,
  stopCelebrationMusic,
} from '@/lib/sounds';
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

function MusicToggle() {
  const [playing, setPlaying] = useState(isCelebrationPlaying());
  useEffect(() => onCelebrationToggle(() => setPlaying(isCelebrationPlaying())), []);
  function toggle() {
    if (playing) stopCelebrationMusic();
    else startCelebrationMusic();
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition ${
        playing ? 'bg-white/25' : 'bg-white/15 hover:bg-white/25 animate-pulse-ring'
      }`}
    >
      <span className="text-lg">{playing ? '🔊' : '🎵'}</span>
      {playing ? 'Pausar música' : 'Tocar música de celebração'}
    </button>
  );
}

export default function ChampionPage() {
  const [searchParams] = useSearchParams();
  const demo = searchParams.get('demo') === '1';

  const [settings, setSettings] = useState<CompetitionSettings | null>(null);
  const [champion, setChampion] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<TeamRanking[]>([]);
  const [topThree, setTopThree] = useState<TeamRanking[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [championPoints, setChampionPoints] = useState<number>(0);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(demoMode: boolean) {
    try {
      setLoading(true);
      const [s, ranking] = await Promise.all([
        competitionService.get(),
        rankingService.list(),
      ]);
      setSettings(s);
      setTopThree(ranking.slice(0, 3));

      // ID da campeã: a real (se encerrada) ou, em modo demo, a 1ª colocada atual.
      const championId = s?.champion_team_id ?? (demoMode ? ranking[0]?.id ?? null : null);
      const simulated = !s?.champion_team_id && demoMode && !!championId;

      if (championId) {
        const [t, m, g] = await Promise.all([
          teamsService.getById(championId),
          membersService.listByTeam(championId),
          galleryService.listByTeam(championId).catch(() => []),
        ]);
        setChampion(t);
        setMembers(m);
        setGallery(g);
        setChampionPoints(ranking.find((r) => r.id === championId)?.total_points ?? 0);
        setIsDemo(simulated);
      } else {
        setChampion(null);
        setMembers([]);
        setGallery([]);
        setChampionPoints(0);
        setIsDemo(false);
        if (s?.has_tie) {
          const ls = await rankingService.leaders();
          setLeaders(ls);
        } else {
          setLeaders([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(demo);
  }, [demo]);

  // Para a música ao sair da página da campeã.
  useEffect(() => () => stopCelebrationMusic(), []);

  useRealtimeTable('competition_settings', () => load(demo));
  useRealtimeTable('scores', () => load(demo));

  if (loading) return <p className="text-slate-500">Carregando...</p>;

  if (!champion && (!settings || settings.status !== 'closed')) {
    return (
      <div className="space-y-10">
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
        <PrizesPodium
          title="Premiações em disputa"
          subtitle="O que cada colocação leva ao final da gincana"
        />
      </div>
    );
  }

  if (!champion && settings && settings.has_tie) {
    return (
      <div className="space-y-10">
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
        <PrizesPodium
          title="Premiações"
          subtitle="O que cada colocação leva ao final da gincana"
        />
      </div>
    );
  }

  if (champion) {
    return (
      <div className="relative space-y-10">
        <Confetti />
        <Fireworks />

        {isDemo && (
          <div className="relative z-10 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            👁️ <strong>Pré-visualização</strong> — esta é uma demonstração da tela de
            celebração usando a equipe líder atual. O resultado oficial só aparece após o
            encerramento da gincana.{' '}
            <Link to="/campea" className="font-semibold underline">
              Sair da demonstração
            </Link>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="relative z-10 overflow-hidden rounded-3xl p-8 md:p-12 text-center text-white shadow-glow"
          style={{ background: `linear-gradient(135deg, ${champion.color}, #0b1f4d)` }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl mb-2 inline-block animate-trophy-bounce"
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

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mx-auto mt-5 max-w-xl text-base md:text-lg opacity-90"
          >
            Parabéns pela conquista! 🎉 Vocês honraram cada desafio com dedicação e
            união. Que esta vitória seja celebrada por toda a equipe! 🏆✨
          </motion.p>

          <div className="mt-6 flex justify-center">
            <MusicToggle />
          </div>

          <ChampionSlideshow images={gallery} />

          <div className="mt-8 flex justify-center">
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

        <div className="relative z-10">
          <PrizesPodium
            top3={topThree}
            title="Premiações"
            subtitle="Reconhecimento para as três melhores equipes da gincana"
          />
        </div>
      </div>
    );
  }

  return null;
}

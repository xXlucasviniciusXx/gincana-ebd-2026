import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teamsService } from '@/services/teams.service';
import { membersService } from '@/services/members.service';
import { scoresService } from '@/services/scores.service';
import { rankingService } from '@/services/ranking.service';
import { activitiesService } from '@/services/activities.service';
import { galleryService, type GalleryItem } from '@/services/gallery.service';
import { badgesService } from '@/services/badges.service';
import BadgesGrid from '@/components/BadgesGrid';
import type { Team, Member, Score, Activity, TeamBadgeRow } from '@/lib/database.types';

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [badges, setBadges] = useState<TeamBadgeRow[]>([]);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    async function load(id: string) {
      try {
        setLoading(true);
        const [t, m, s, a, r, g, b] = await Promise.all([
          teamsService.getById(id),
          membersService.listByTeam(id),
          scoresService.listByTeam(id),
          activitiesService.list(),
          rankingService.list(),
          galleryService.listByTeam(id),
          badgesService.listByTeam(id),
        ]);
        if (cancelled) return;
        setTeam(t);
        setMembers(m);
        setScores(s);
        setActivities(a);
        setGallery(g);
        setBadges(b);
        setPosition(r.find((row) => row.id === id)?.rank_position ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar equipe');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load(teamId);
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) return <p className="text-slate-500">Carregando...</p>;
  if (error) return <p className="text-brand-red">{error}</p>;
  if (!team) {
    return (
      <div className="card text-center">
        <p>Equipe não encontrada.</p>
        <Link to="/" className="text-brand-teal hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  const total = scores.reduce((sum, s) => sum + Number(s.points), 0);
  const activityById = new Map(activities.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <Link to="/equipes" className="text-sm text-brand-teal hover:underline">
        ← Todas as equipes
      </Link>

      {/* HERO da equipe */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl text-white shadow-glow"
        style={{ background: `linear-gradient(135deg, ${team.color}, #0b1f4d)` }}
      >
        {team.banner_url && (
          <img
            src={team.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative px-6 py-8 md:px-10 md:py-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            {team.photo_url ? (
              <img
                src={team.photo_url}
                alt={team.name}
                className="h-24 w-24 rounded-2xl object-cover shadow-card border-4 border-white/30"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold heading-display">
                {team.name.charAt(0)}
              </div>
            )}
            <div>
              {position && (
                <p className="text-xs uppercase tracking-widest opacity-80">
                  {position}º lugar no ranking
                </p>
              )}
              <h1 className="heading-display text-3xl md:text-4xl font-bold">{team.name}</h1>
              {team.leader_name && (
                <p className="text-sm opacity-80">Líder: {team.leader_name}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-extrabold drop-shadow">{total}</div>
            <div className="text-xs uppercase tracking-widest opacity-80">pontos totais</div>
          </div>
        </div>
      </motion.section>

      {/* Bio + redes */}
      {(team.bio || team.instagram_url || team.bible_reference || team.theme_verse || team.war_cry) && (
        <section className="card space-y-3">
          {team.bio && <p className="text-slate-700 leading-relaxed">{team.bio}</p>}
          {team.theme_verse && (
            <blockquote className="border-l-4 border-brand-yellow pl-4 italic text-slate-600">
              "{team.theme_verse}"
              {team.bible_reference && (
                <span className="block not-italic text-xs text-slate-500 mt-1">
                  — {team.bible_reference}
                </span>
              )}
            </blockquote>
          )}
          {team.war_cry && (
            <p className="text-sm">
              <span className="badge bg-brand-yellow/20 text-brand-navy mr-2">Grito de guerra</span>
              {team.war_cry}
            </p>
          )}
          {team.instagram_url && (
            <a
              href={team.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-card hover:opacity-90"
            >
              📷 Instagram da equipe
            </a>
          )}
        </section>
      )}

      {/* Conquistas */}
      {badges.length > 0 && (
        <section>
          <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">
            Conquistas
          </h2>
          <BadgesGrid badges={badges} />
        </section>
      )}

      {/* Integrantes */}
      <section>
        <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">Integrantes</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {members.map((m) => (
            <div key={m.id} className="card text-center">
              {m.photo_url ? (
                <img
                  src={m.photo_url}
                  alt={m.name}
                  className="mx-auto h-20 w-20 rounded-full object-cover shadow-card"
                />
              ) : (
                <div
                  className="mx-auto h-20 w-20 rounded-full shadow-card flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: team.color }}
                >
                  {m.name.charAt(0)}
                </div>
              )}
              <div className="mt-2 font-semibold text-brand-navy text-sm truncate">{m.name}</div>
              {m.role && <div className="text-xs text-slate-500">{m.role}</div>}
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-slate-500 text-sm col-span-full">
              Nenhum integrante cadastrado.
            </p>
          )}
        </div>
      </section>

      {/* Galeria */}
      {gallery.length > 0 && (
        <section>
          <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">Galeria</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((g) => (
              <motion.figure
                key={g.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-2"
              >
                <img
                  src={g.image_url}
                  alt={g.caption ?? ''}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                {g.caption && (
                  <figcaption className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {g.caption}
                  </figcaption>
                )}
              </motion.figure>
            ))}
          </div>
        </section>
      )}

      {/* Histórico de atividades */}
      <section>
        <h2 className="heading-display text-xl font-bold text-brand-navy mb-3">
          Histórico de pontuações
        </h2>
        <ul className="space-y-2">
          {scores.map((s) => {
            const act = activityById.get(s.activity_id);
            return (
              <li key={s.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold text-brand-navy">
                    {act?.name ?? 'Atividade'}
                  </div>
                  {s.observation && (
                    <div className="text-xs text-slate-500">{s.observation}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-brand-teal">+{s.points}</div>
                  {act?.max_points ? (
                    <div className="text-[10px] text-slate-400">
                      máx {act.max_points}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
          {scores.length === 0 && (
            <li className="text-slate-500 text-sm">Nenhum lançamento ainda.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

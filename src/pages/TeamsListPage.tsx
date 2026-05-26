import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teamsService } from '@/services/teams.service';
import { rankingService } from '@/services/ranking.service';
import type { Team, TeamRanking } from '@/lib/database.types';

export default function TeamsListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [ranking, setRanking] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, r] = await Promise.all([teamsService.list(), rankingService.list()]);
        if (cancelled) return;
        setTeams(t);
        setRanking(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const pointsByTeam = new Map(ranking.map((r) => [r.id, r.total_points]));
  const positionByTeam = new Map(ranking.map((r) => [r.id, r.rank_position]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Equipes</h1>
        <p className="text-slate-600">
          Conheça os participantes da Gincana EBD 2026.
        </p>
      </header>

      {loading && <p className="text-slate-500">Carregando...</p>}
      {error && <p className="text-brand-red">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team, idx) => (
          <motion.article
            key={team.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="card group relative overflow-hidden hover:-translate-y-1 hover:shadow-glow transition"
            style={{ borderTopColor: team.color, borderTopWidth: 4 }}
          >
            {team.banner_url && (
              <div className="absolute inset-x-0 top-0 h-24 -mx-5 -mt-5 overflow-hidden opacity-30">
                <img src={team.banner_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="relative flex items-start gap-3">
              {team.photo_url ? (
                <img
                  src={team.photo_url}
                  alt={team.name}
                  className="h-16 w-16 rounded-2xl object-cover shadow-card"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-2xl shadow-card flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: team.color }}
                >
                  {team.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="heading-display text-lg font-bold text-brand-navy truncate">
                  {team.name}
                </h2>
                {team.leader_name && (
                  <p className="text-xs text-slate-500">Líder: {team.leader_name}</p>
                )}
                {team.theme_verse && (
                  <p className="mt-1 text-sm italic text-slate-600 line-clamp-2">
                    "{team.theme_verse}"
                  </p>
                )}
              </div>
            </div>
            <div className="relative mt-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400">
                  {positionByTeam.get(team.id) ? `${positionByTeam.get(team.id)}º lugar` : 'Sem ranking'}
                </div>
                <div className="text-2xl font-bold text-brand-navy">
                  {pointsByTeam.get(team.id) ?? 0}
                  <span className="text-sm font-normal text-slate-500"> pts</span>
                </div>
              </div>
              <Link
                to={`/equipes/${team.id}`}
                className="btn-teal text-xs px-3 py-1.5"
              >
                Ver perfil →
              </Link>
            </div>
          </motion.article>
        ))}

        {!loading && teams.length === 0 && (
          <p className="text-slate-500">Nenhuma equipe cadastrada ainda.</p>
        )}
      </div>
    </div>
  );
}

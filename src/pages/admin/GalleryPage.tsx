import { useEffect, useState } from 'react';
import { teamsService } from '@/services/teams.service';
import { galleryService, type GalleryItem } from '@/services/gallery.service';
import { storageService } from '@/services/storage.service';
import ImageUpload from '@/components/ImageUpload';
import type { Team } from '@/lib/database.types';

export default function GalleryPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    teamsService.list().then((t) => {
      if (cancelled) return;
      setTeams(t);
      if (t.length > 0) setTeamId(t[0].id);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!teamId) return;
    galleryService.listByTeam(teamId).then(setItems).catch((e) => setError(String(e)));
  }, [teamId]);

  async function handleAdd() {
    if (!pendingUrl || !teamId) return;
    try {
      await galleryService.add({
        team_id: teamId,
        image_url: pendingUrl,
        caption: caption || null,
      });
      setPendingUrl(null);
      setCaption('');
      setItems(await galleryService.listByTeam(teamId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar');
    }
  }

  async function handleRemove(item: GalleryItem) {
    if (!confirm('Remover esta foto da galeria? O arquivo também será apagado do Storage.'))
      return;
    try {
      await galleryService.remove(item.id);
      storageService.remove(item.image_url).catch(() => {
        /* ignora */
      });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover');
    }
  }

  async function handleUpdateCaption(item: GalleryItem, value: string) {
    try {
      await galleryService.update(item.id, { caption: value || null });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, caption: value || null } : i)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar');
    }
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="heading-display text-3xl font-bold text-brand-navy">Galeria</h1>
        <p className="text-sm text-slate-600">
          Fotos de cada equipe. Aparecem na página pública da equipe.
        </p>
      </header>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <section className="card grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Equipe</span>
          <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-brand-navy">Adicionar foto</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ImageUpload
            label="Imagem"
            folder="teams/gallery"
            value={pendingUrl}
            onChange={setPendingUrl}
          />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Legenda (opcional)</span>
            <input
              className="input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!pendingUrl}
          className="btn-primary"
        >
          Adicionar à galeria
        </button>
      </section>

      <section>
        <h2 className="font-semibold text-brand-navy mb-3">
          Fotos ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma foto na galeria desta equipe.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="card p-2 space-y-2">
                <img
                  src={item.image_url}
                  alt={item.caption ?? ''}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <input
                  className="input text-xs"
                  placeholder="Legenda"
                  defaultValue={item.caption ?? ''}
                  onBlur={(e) => {
                    if ((item.caption ?? '') !== e.target.value) {
                      handleUpdateCaption(item, e.target.value);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="w-full rounded-lg border border-red-300 px-2 py-1 text-xs text-brand-red hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

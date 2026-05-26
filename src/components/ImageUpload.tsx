import { useRef, useState } from 'react';
import { storageService, type UploadFolder } from '@/services/storage.service';

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  folder: UploadFolder;
  label?: string;
  aspect?: 'square' | 'banner';
  /** Apaga o arquivo antigo do Storage quando substituído/removido. Default: false. */
  deleteOnReplace?: boolean;
};

export default function ImageUpload({
  value,
  onChange,
  folder,
  label,
  aspect = 'square',
  deleteOnReplace = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Arquivo não é uma imagem.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const previous = value;
      const url = await storageService.upload(file, folder);
      onChange(url);
      if (previous && deleteOnReplace) {
        storageService.remove(previous).catch(() => {
          /* falha silenciosa para não bloquear a UI */
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleRemove() {
    const url = value;
    onChange(null);
    if (url && deleteOnReplace) {
      try {
        await storageService.remove(url);
      } catch {
        /* ignora */
      }
    }
  }

  const aspectClass = aspect === 'banner' ? 'aspect-[3/1]' : 'aspect-square';

  return (
    <div className="space-y-1">
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition ${
          dragOver
            ? 'border-brand-teal bg-brand-teal/5'
            : 'border-slate-300 bg-slate-50 hover:border-brand-teal/50'
        } ${aspectClass}`}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded bg-white/90 px-2 py-1 font-medium text-slate-700 hover:bg-white"
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Trocar'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="rounded bg-red-600/90 px-2 py-1 font-medium text-white hover:bg-red-600"
                disabled={uploading}
              >
                Remover
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm text-slate-500"
          >
            {uploading ? (
              <span className="text-brand-teal">Enviando...</span>
            ) : (
              <>
                <span className="text-2xl">🖼️</span>
                <span>Clique ou arraste uma imagem</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">
                  PNG · JPG · WEBP · até 5 MB
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}

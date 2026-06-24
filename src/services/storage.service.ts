import { supabase } from '@/lib/supabase';

const BUCKET = 'gincana';

function safeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

export type UploadFolder =
  | 'teams/photos'
  | 'teams/banners'
  | 'teams/gallery'
  | 'members/photos'
  | 'activities/photos'
  | 'churches/logos'
  | 'escape/uploads'
  | 'escape/images';

export const storageService = {
  async upload(file: File, folder: UploadFolder): Promise<string> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagem maior que 5 MB. Reduza o arquivo e tente novamente.');
    }
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}.${ext}`
      .replace(/\.{2,}/g, '.');

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  // Tenta apagar pelo URL público; ignora se não conseguir extrair o path.
  async remove(publicUrl: string): Promise<void> {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) return;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  },
};

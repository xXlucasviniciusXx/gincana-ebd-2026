import { supabase } from '@/lib/supabase';

export type GalleryItem = {
  id: string;
  team_id: string;
  image_url: string;
  caption: string | null;
  order_number: number;
  created_at: string;
};

export const galleryService = {
  async listByTeam(teamId: string): Promise<GalleryItem[]> {
    const { data, error } = await supabase
      .from('team_gallery')
      .select('*')
      .eq('team_id', teamId)
      .order('order_number', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as GalleryItem[]) ?? [];
  },

  async add(payload: {
    team_id: string;
    image_url: string;
    caption?: string | null;
    order_number?: number;
  }): Promise<GalleryItem> {
    const { data, error } = await supabase
      .from('team_gallery')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as GalleryItem;
  },

  async update(
    id: string,
    payload: Partial<{ caption: string | null; order_number: number }>,
  ): Promise<GalleryItem> {
    const { data, error } = await supabase
      .from('team_gallery')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as GalleryItem;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('team_gallery').delete().eq('id', id);
    if (error) throw error;
  },
};

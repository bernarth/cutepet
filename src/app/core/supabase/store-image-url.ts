import { CutePetSupabase } from './supabase.client';

export function storeImageUrl(supabase: CutePetSupabase, storagePath: string): string {
  return supabase.storage.from('store-images').getPublicUrl(storagePath).data.publicUrl;
}

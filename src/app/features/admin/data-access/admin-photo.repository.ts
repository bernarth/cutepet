import { Service, inject } from '@angular/core';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap, unwrapNullable } from '@shared/data-access/supabase-result';
import { AdminPhoto } from '../models/admin-product';
import { PhotoPosition } from '../models/photo-order';

const BUCKET = 'store-images';

export interface NewPhoto {
  readonly productId: number;
  readonly file: Blob;
  readonly alt: string;
  readonly sortOrder: number;
}

/**
 * @description Product photos: the file lives in the public `store-images` bucket and the row in `product_photos`
 */
@Service()
export class AdminPhotoRepository {
  private readonly supabase = inject(SUPABASE);

  /**
   * @description Uploads the file first. If the row cannot be saved, the file is removed so nothing is left behind
   */
  async addPhoto(photo: NewPhoto): Promise<void> {
    const path = `products/${photo.productId}/${crypto.randomUUID()}.jpg`;
    unwrap(
      await this.supabase.storage
        .from(BUCKET)
        .upload(path, photo.file, { contentType: 'image/jpeg', cacheControl: '31536000' }),
    );

    try {
      unwrapNullable(
        await this.supabase.from('product_photos').insert({
          product_id: photo.productId,
          storage_path: path,
          alt_text: photo.alt,
          sort_order: photo.sortOrder,
        }),
      );
    } catch (error) {
      await this.supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
  }

  /**
   * @description Deletes the row and then the file. A file still used by another row (local seed data) is kept
   */
  async deletePhoto(photo: AdminPhoto): Promise<void> {
    unwrapNullable(await this.supabase.from('product_photos').delete().eq('id', photo.id));

    const { count } = await this.supabase
      .from('product_photos')
      .select('id', { count: 'exact', head: true })
      .eq('storage_path', photo.storagePath);

    if (count === 0) {
      unwrap(await this.supabase.storage.from(BUCKET).remove([photo.storagePath]));
    }
  }

  async updateAlt(photoId: number, alt: string): Promise<void> {
    unwrapNullable(
      await this.supabase.from('product_photos').update({ alt_text: alt }).eq('id', photoId),
    );
  }

  async savePositions(positions: readonly PhotoPosition[]): Promise<void> {
    for (const { id, sortOrder } of positions) {
      unwrapNullable(
        await this.supabase.from('product_photos').update({ sort_order: sortOrder }).eq('id', id),
      );
    }
  }
}

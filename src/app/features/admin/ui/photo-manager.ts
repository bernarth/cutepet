import { NgOptimizedImage } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { AdminPhoto } from '../models/admin-product';

export interface PhotoMove {
  readonly photo: AdminPhoto;
  readonly targetIndex: number;
}

@Component({
  selector: 'cp-photo-manager',
  imports: [NgOptimizedImage, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './photo-manager.html',
  styleUrl: './photo-manager.scss',
})
export class PhotoManager {
  readonly photos = input.required<readonly AdminPhoto[]>();
  readonly isBusy = input(false);
  readonly status = input<string | null>(null);

  readonly filesPicked = output<File[]>();
  readonly move = output<PhotoMove>();
  readonly editAlt = output<AdminPhoto>();
  readonly remove = output<AdminPhoto>();

  protected pick(picker: HTMLInputElement): void {
    const files = [...(picker.files ?? [])];
    picker.value = '';

    if (files.length > 0) {
      this.filesPicked.emit(files);
    }
  }
}

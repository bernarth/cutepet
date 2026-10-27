import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, linkedSignal } from '@angular/core';

import { Photo } from '../models/product';

@Component({
  selector: 'cp-photo-gallery',
  imports: [NgOptimizedImage],
  template: `
    <div class="main">
      @if (current(); as photo) {
        <img
          [ngSrc]="photo.url"
          [alt]="photo.alt"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 50vw"
        />
      }
    </div>
    @if (photos().length > 1) {
      <ul class="thumbs" aria-label="Fotos de la prenda">
        @for (photo of photos(); track photo.url + $index; let index = $index) {
          <li>
            <button
              type="button"
              [attr.aria-label]="'Ver foto ' + (index + 1)"
              [attr.aria-current]="index === selected()"
              [class.active]="index === selected()"
              (click)="selected.set(index)"
            >
              <img [ngSrc]="photo.url" alt="" width="64" height="80" />
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .main {
      position: relative;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border: var(--cp-border);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container);
    }
    .main img {
      object-fit: cover;
    }
    .thumbs {
      display: flex;
      gap: var(--cp-space-sm);
      margin: var(--cp-space-sm) 0 0;
      padding: 0;
      list-style: none;
    }
    button {
      padding: 0;
      border: 2px solid transparent;
      border-radius: var(--cp-space-sm);
      overflow: hidden;
      background: none;
      cursor: pointer;
      line-height: 0;
    }
    button.active {
      border-color: var(--cp-ink);
    }
    button img {
      object-fit: cover;
    }
  `,
})
export class PhotoGallery {
  readonly photos = input.required<readonly Photo[]>();

  protected readonly selected = linkedSignal({ source: this.photos, computation: () => 0 });
  protected readonly current = computed(() => this.photos()[this.selected()] ?? null);
}

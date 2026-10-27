import { RESPONSE_INIT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { environment } from '@env/environment';

export interface PageMetaData {
  readonly title: string;
  readonly description: string;
  /** Path of the page, for example /catalogo/abrigo-rosa */
  readonly path: string;
  /** Absolute URL. Falls back to the default image in public/ */
  readonly imageUrl?: string;
  readonly price?: number;
}

const SITE_NAME = 'CutePet';
const DEFAULT_IMAGE_PATH = '/og-image.png';

/** Title and Open Graph tags for pages rendered on the server, so WhatsApp shows a real preview */
@Service()
export class PageMeta {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly response = inject(RESPONSE_INIT, { optional: true });

  set(page: PageMetaData): void {
    const fullTitle = `${page.title} - ${SITE_NAME}`;
    this.title.setTitle(fullTitle);

    const tags: Record<string, string> = {
      'og:site_name': SITE_NAME,
      'og:title': page.title,
      'og:description': page.description,
      'og:url': `${environment.siteUrl}${page.path}`,
      'og:image': page.imageUrl ?? `${environment.siteUrl}${DEFAULT_IMAGE_PATH}`,
      'og:type': page.price === undefined ? 'website' : 'product',
      'og:locale': 'es_BO',
    };
    for (const [property, content] of Object.entries(tags)) {
      this.meta.updateTag({ property, content });
    }
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.setPrice(page.price);
  }

  /** Only has an effect during server rendering */
  setNotFoundStatus(): void {
    if (this.response) {
      this.response.status = 404;
    }
  }

  private setPrice(price: number | undefined): void {
    if (price === undefined) {
      this.meta.removeTag("property='product:price:amount'");
      this.meta.removeTag("property='product:price:currency'");
      return;
    }
    this.meta.updateTag({ property: 'product:price:amount', content: price.toFixed(2) });
    this.meta.updateTag({ property: 'product:price:currency', content: 'BOB' });
  }
}

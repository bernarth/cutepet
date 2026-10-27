import { Service, computed, inject, resource } from '@angular/core';

import { LookupRepository } from './lookup.repository';

/** Provided by SizeGuidePage */
@Service({ autoProvided: false })
export class SizeGuideStore {
  private readonly lookups = inject(LookupRepository);

  private readonly sizeList = resource({
    id: 'size-guide-sizes',
    loader: () => this.lookups.listActiveSizes(),
  });

  readonly sizes = computed(() => (this.sizeList.hasValue() ? this.sizeList.value() : []));
  readonly isLoading = computed(() => this.sizeList.isLoading());
  readonly hasError = computed(() => this.sizeList.status() === 'error');
}

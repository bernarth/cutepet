import { Service, computed, inject, linkedSignal, resource, signal } from '@angular/core';

import { AuditEntry } from '../models/audit-entry';
import { AuditLookups } from '../models/audit-fields';
import { toAuditRow } from '../models/audit-row';
import { isoDate } from '../models/date-format';
import { AdminAuditRepository, AuditQuery } from './admin-audit.repository';
import { AdminProductRepository } from './admin-product.repository';

const PAGE_SIZE = 30;
const DEFAULT_DAYS = 30;

interface AuditFilters {
  readonly table: string | null;
  readonly fromDate: string;
  readonly toDate: string;
}

@Service()
export class AdminAuditStore {
  private readonly repository = inject(AdminAuditRepository);
  private readonly productRepository = inject(AdminProductRepository);

  readonly table = signal<string | null>(null);
  readonly fromDate = signal(daysAgo(DEFAULT_DAYS - 1));
  readonly toDate = signal(isoDate(new Date()));
  readonly hasValidRange = computed(() => this.fromDate() <= this.toDate());

  private readonly filters = computed<AuditFilters | undefined>(() =>
    this.hasValidRange()
      ? { table: this.table(), fromDate: this.fromDate(), toDate: this.toDate() }
      : undefined,
  );

  private readonly firstPage = resource({
    params: () => this.filters(),
    loader: ({ params }) => this.repository.list(toQuery(params)),
  });
  /** Pages added with "Ver más". They start again whenever a filter changes */
  private readonly nextPages = linkedSignal<AuditFilters | undefined, AuditEntry[]>({
    source: this.filters,
    computation: () => [],
  });
  private readonly lastPageSize = linkedSignal(() => this.firstPage.value()?.length ?? 0);
  private readonly lookupsResource = resource({
    loader: () => this.productRepository.listLookups(),
  });

  readonly isLoadingMore = signal(false);
  readonly isLoading = computed(() => this.firstPage.isLoading() || this.isLoadingMore());
  readonly hasError = computed(() => this.firstPage.error() !== undefined);
  readonly canLoadMore = computed(() => this.lastPageSize() === PAGE_SIZE);

  private readonly lookups = computed<AuditLookups>(() => {
    const lookups = this.lookupsResource.value();
    return {
      sizes: new Map((lookups?.sizes ?? []).map((size) => [size.id, size.label])),
      categories: new Map(
        (lookups?.categories ?? []).map((category) => [category.id, category.name]),
      ),
      petTypes: new Map((lookups?.petTypes ?? []).map((petType) => [petType.id, petType.name])),
    };
  });

  readonly rows = computed(() =>
    [...(this.firstPage.value() ?? []), ...this.nextPages()].map((entry) =>
      toAuditRow(entry, this.lookups()),
    ),
  );

  reload(): void {
    this.firstPage.reload();
  }

  async loadMore(): Promise<void> {
    const filters = this.filters();
    const last = this.rows().at(-1);

    if (!filters || !last) {
      return;
    }

    this.isLoadingMore.set(true);
    try {
      const page = await this.repository.list({ ...toQuery(filters), beforeId: last.id });
      this.nextPages.update((pages) => [...pages, ...page]);
      this.lastPageSize.set(page.length);
    } finally {
      this.isLoadingMore.set(false);
    }
  }
}

function toQuery(filters: AuditFilters): AuditQuery {
  return {
    table: filters.table ?? undefined,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    pageSize: PAGE_SIZE,
  };
}

function daysAgo(days: number): string {
  const moment = new Date();
  moment.setDate(moment.getDate() - days);
  return isoDate(moment);
}

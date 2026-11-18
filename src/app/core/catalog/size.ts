import { Tables } from '@core/supabase/database.types';

export type Measurement = 'neck' | 'chest' | 'backLength';

export const MEASUREMENTS: readonly Measurement[] = ['neck', 'chest', 'backLength'];

export const MEASUREMENT_LABELS: Readonly<Record<Measurement, string>> = {
  neck: 'cuello',
  chest: 'pecho',
  backLength: 'largo',
};

export interface Measurements {
  readonly neck?: number;
  readonly chest?: number;
  readonly backLength?: number;
}

export interface MeasurementRange {
  readonly min: number;
  readonly max: number;
}

export interface Size {
  readonly id: number;
  readonly label: string;
  readonly sortOrder: number;
  readonly neck: MeasurementRange;
  readonly chest: MeasurementRange;
  readonly backLength: MeasurementRange;
}

export function toSize(row: Tables<'sizes'>): Size {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
    neck: { min: row.neck_min, max: row.neck_max },
    chest: { min: row.chest_min, max: row.chest_max },
    backLength: { min: row.back_length_min, max: row.back_length_max },
  };
}

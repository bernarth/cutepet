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

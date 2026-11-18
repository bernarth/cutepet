import { Pipe, PipeTransform } from '@angular/core';

import { formatDateTime } from '../models/date-format';

@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(isoTimestamp: string): string {
    return formatDateTime(isoTimestamp);
  }
}

import { TestBed } from '@angular/core/testing';

import { SUPABASE } from '@core/supabase/supabase.client';
import { NotificationChannelChanges } from '../models/notification-channel';
import { NotificationChannelsRepository } from './notification-channels.repository';

const changes: NotificationChannelChanges = {
  name: 'Dueña',
  destination: '123',
  events: ['proof_uploaded'],
  is_active: true,
};

/** PostgREST answers a write without select with 201 or 204 and no body, so data is null */
const savedWithoutBody = { data: null, error: null };

function setup() {
  const eq = vi.fn().mockResolvedValue(savedWithoutBody);
  const table = {
    insert: vi.fn().mockResolvedValue(savedWithoutBody),
    update: vi.fn().mockReturnValue({ eq }),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE, useValue: { from: vi.fn().mockReturnValue(table) } }],
  });
  return { repository: TestBed.inject(NotificationChannelsRepository), table, eq };
}

describe('NotificationChannelsRepository', () => {
  it('treats an insert that returns no row as saved', async () => {
    const { repository, table } = setup();

    await expect(repository.save(null, changes)).resolves.toBeUndefined();
    expect(table.insert).toHaveBeenCalledWith({ ...changes, type: 'telegram' });
  });

  it('treats an update that returns no row as saved', async () => {
    const { repository, eq } = setup();

    await expect(repository.save(3, changes)).resolves.toBeUndefined();
    await expect(repository.setActive(3, false)).resolves.toBeUndefined();
    expect(eq).toHaveBeenCalledWith('id', 3);
  });
});

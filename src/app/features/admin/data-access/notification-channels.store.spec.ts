import { TestBed } from '@angular/core/testing';

import { EMPTY_CHANNEL_FORM } from '../models/notification-channel';
import { NotificationChannelsRepository } from './notification-channels.repository';
import { NotificationChannelsStore, TEST_RESULT_DELAY_MS } from './notification-channels.store';

function setup() {
  const repository = {
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    setActive: vi.fn().mockResolvedValue(undefined),
    sendTest: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: NotificationChannelsRepository, useValue: repository }],
  });
  const store = TestBed.inject(NotificationChannelsStore);
  const reload = vi.spyOn(store, 'reload');
  return { store, repository, reload };
}

describe('NotificationChannelsStore', () => {
  afterEach(() => vi.useRealTimers());

  it('saves the form as database changes and reloads the list', async () => {
    const { store, repository, reload } = setup();

    await store.save(null, { ...EMPTY_CHANNEL_FORM, name: ' Dueña ', chatId: '123' });

    expect(repository.save).toHaveBeenCalledWith(null, {
      name: 'Dueña',
      destination: '123',
      events: ['proof_uploaded', 'qr_expiry'],
      is_active: true,
    });
    expect(reload).toHaveBeenCalledOnce();
  });

  it('activates or deactivates a channel and reloads the list', async () => {
    const { store, repository, reload } = setup();

    await store.setActive(3, false);

    expect(repository.setActive).toHaveBeenCalledWith(3, false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads once after a test so a failed delivery shows in the list', async () => {
    vi.useFakeTimers();
    const { store, repository, reload } = setup();

    await store.sendTest(3);

    expect(repository.sendTest).toHaveBeenCalledWith(3);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TEST_RESULT_DELAY_MS);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the test could not be queued', async () => {
    vi.useFakeTimers();
    const { store, repository, reload } = setup();
    repository.sendTest.mockRejectedValue(new Error('FORBIDDEN'));

    await expect(store.sendTest(3)).rejects.toThrow('FORBIDDEN');
    vi.advanceTimersByTime(TEST_RESULT_DELAY_MS);
    expect(reload).not.toHaveBeenCalled();
  });
});

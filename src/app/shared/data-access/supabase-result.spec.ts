import { AppError, unwrap, unwrapNullable } from './supabase-result';

describe('unwrap', () => {
  it('returns data when there is no error', () => {
    expect(unwrap({ data: [1, 2], error: null })).toEqual([1, 2]);
  });

  it('throws AppError when Supabase returns an error', () => {
    expect(() => unwrap({ data: null, error: { message: 'boom', code: '42' } })).toThrow(AppError);
  });

  it('keeps the detail of a database error', () => {
    const detail = '{"sold": [3], "reserved": []}';
    let caught: unknown;
    try {
      unwrap({
        data: null,
        error: { message: 'ITEMS_UNAVAILABLE', code: 'P0001', details: detail },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toEqual(expect.objectContaining({ message: 'ITEMS_UNAVAILABLE', detail }));
  });

  it('throws NOT_FOUND when data is null', () => {
    expect(() => unwrap({ data: null, error: null })).toThrow('No se encontraron datos');
  });
});

describe('unwrapNullable', () => {
  it('allows null data', () => {
    expect(unwrapNullable({ data: null, error: null })).toBeNull();
  });
});

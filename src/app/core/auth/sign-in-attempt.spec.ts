import { parseSignInAttempt } from './sign-in-attempt';

describe('parseSignInAttempt', () => {
  it('reads what this tab stored', () => {
    const transfer = { kind: 'transferring', transferToken: 't', orderCodes: ['CP1'] };

    expect(parseSignInAttempt('{"kind":"linking"}')).toEqual({ kind: 'linking' });
    expect(parseSignInAttempt(JSON.stringify(transfer))).toEqual(transfer);
  });

  it.each([
    null,
    '',
    'not json',
    '[]',
    '"linking"',
    '{"kind":"other"}',
    '{"kind":"transferring"}',
    '{"kind":"transferring","transferToken":1,"orderCodes":[]}',
    '{"kind":"transferring","transferToken":"t","orderCodes":[1]}',
  ])('ignores %j', (stored) => {
    expect(parseSignInAttempt(stored)).toBeNull();
  });
});

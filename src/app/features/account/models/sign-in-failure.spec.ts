import { AppError } from '@shared/data-access/supabase-result';
import { addressFailure, exchangeFailure } from './sign-in-failure';

describe('addressFailure', () => {
  it('tells a cancelled sign-in apart from other denials', () => {
    expect(addressFailure('access_denied', null)).toBe('cancelled');
    expect(addressFailure('access_denied', 'signup_disabled')).toBe('failed');
  });

  it('says the sign-in expired when Supabase does not know it', () => {
    expect(addressFailure('invalid_request', 'bad_oauth_state')).toBe('expired');
    expect(addressFailure('invalid_request', 'flow_state_expired')).toBe('expired');
  });

  it.each(['identity_already_exists', 'email_exists'])(
    'knows the account exists for %s',
    (code) => {
      expect(addressFailure('server_error', code)).toBe('account_exists');
    },
  );

  it('says nothing is in progress when the address has no error', () => {
    expect(addressFailure(null, null)).toBe('nothing_in_progress');
  });

  it('keeps a general message for anything else', () => {
    expect(addressFailure('server_error', 'unexpected_failure')).toBe('failed');
    expect(addressFailure('server_error', null)).toBe('failed');
  });
});

describe('exchangeFailure', () => {
  it.each(['pkce_code_verifier_not_found', 'bad_code_verifier'])(
    'asks to start again here for %s',
    (code) => {
      expect(exchangeFailure(new AppError('x', code))).toBe('other_browser');
    },
  );

  it('says a used or old code expired', () => {
    expect(exchangeFailure(new AppError('x', 'flow_state_not_found'))).toBe('expired');
  });

  it('keeps a general message for anything else', () => {
    expect(exchangeFailure(new AppError('x', 'unexpected_failure'))).toBe('failed');
    expect(exchangeFailure(new TypeError('Failed to fetch'))).toBe('failed');
  });
});

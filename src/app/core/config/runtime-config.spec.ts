import { readRuntimeConfig, runtimeConfigScript } from './runtime-config';

const validEnv = {
  SITE_URL: 'https://qa.example.com/',
  SUPABASE_URL: 'https://ref.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
};

describe('readRuntimeConfig', () => {
  it('reads the variables and trims the trailing slash of the site URL', () => {
    expect(readRuntimeConfig({ ...validEnv, NO_INDEX: 'false' })).toEqual({
      siteUrl: 'https://qa.example.com',
      supabaseUrl: 'https://ref.supabase.co',
      supabasePublishableKey: 'sb_publishable_abc',
      noIndex: false,
    });
  });

  it('keeps search engines out unless NO_INDEX is false', () => {
    expect(readRuntimeConfig(validEnv).noIndex).toBe(true);
    expect(readRuntimeConfig({ ...validEnv, NO_INDEX: 'true' }).noIndex).toBe(true);
  });

  it('fails when a required variable is missing or blank', () => {
    expect(() => readRuntimeConfig({ ...validEnv, SUPABASE_URL: undefined })).toThrow(
      'Missing environment variable SUPABASE_URL',
    );
    expect(() => readRuntimeConfig({ ...validEnv, SITE_URL: ' ' })).toThrow(
      'Missing environment variable SITE_URL',
    );
  });

  it('rejects a key that is not publishable', () => {
    expect(() =>
      readRuntimeConfig({ ...validEnv, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }),
    ).toThrow('SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_');
  });
});

describe('runtimeConfigScript', () => {
  it('assigns the config to a browser global', () => {
    const config = readRuntimeConfig(validEnv);

    expect(runtimeConfigScript(config)).toBe(
      `window.cutepetRuntimeConfig = ${JSON.stringify(config)};\n`,
    );
  });
});

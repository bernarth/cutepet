export function robotsTxt(noIndex: boolean): string {
  return noIndex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n';
}

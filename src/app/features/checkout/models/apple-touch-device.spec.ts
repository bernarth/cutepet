import { isAppleTouchDevice } from './apple-touch-device';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 Chrome/130.0';

describe('isAppleTouchDevice', () => {
  it('finds iPhones and iPads, which report themselves as a Mac with touch', () => {
    expect(isAppleTouchDevice({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleTouchDevice({ userAgent: MAC, maxTouchPoints: 5 })).toBe(true);
  });

  it('leaves out Android phones and Mac computers', () => {
    expect(isAppleTouchDevice({ userAgent: ANDROID, maxTouchPoints: 5 })).toBe(false);
    expect(isAppleTouchDevice({ userAgent: MAC, maxTouchPoints: 0 })).toBe(false);
  });
});

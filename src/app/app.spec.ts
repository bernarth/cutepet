import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: RUNTIME_CONFIG,
          useValue: {
            siteUrl: 'http://localhost:4200',
            supabaseUrl: 'http://127.0.0.1:54321',
            supabasePublishableKey: 'sb_publishable_test',
            turnstileSiteKey: '1x00000000000000000000AA',
            noIndex: true,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

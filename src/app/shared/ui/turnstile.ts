import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileOptions {
  readonly sitekey: string;
  readonly language: string;
  readonly appearance: 'interaction-only';
  readonly callback: (token: string) => void;
  readonly 'expired-callback': () => void;
  readonly 'error-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(document: Document): Promise<TurnstileApi> {
  scriptLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const api = (document.defaultView as TurnstileWindow | null)?.turnstile;
      if (api) {
        resolve(api);
      } else {
        reject(new Error('Turnstile did not load'));
      }
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error('Turnstile did not load'));
    };
    document.head.appendChild(script);
  });

  return scriptLoading;
}

/**
 * @description Cloudflare Turnstile check. It only shows itself when Cloudflare needs the person
 * to interact. Emits a token when the check passes and null when the token is no longer valid
 */
@Component({
  selector: 'cp-turnstile',
  template: '',
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }
  `,
})
export class Turnstile {
  readonly siteKey = input.required<string>();
  readonly token = output<string | null>();
  readonly failed = output();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;

  constructor() {
    afterNextRender(() => void this.render());
    inject(DestroyRef).onDestroy(() => {
      if (this.api && this.widgetId) {
        this.api.remove(this.widgetId);
      }
    });
  }

  /** A token works only once, so ask for a new one after each use */
  reset(): void {
    this.token.emit(null);
    if (this.api && this.widgetId) {
      this.api.reset(this.widgetId);
    }
  }

  private async render(): Promise<void> {
    try {
      this.api = await loadTurnstile(this.document);
    } catch {
      this.failed.emit();
      return;
    }

    this.widgetId = this.api.render(this.host.nativeElement, {
      sitekey: this.siteKey(),
      language: 'es',
      appearance: 'interaction-only',
      callback: (token) => this.token.emit(token),
      'expired-callback': () => this.token.emit(null),
      'error-callback': () => this.failed.emit(),
    });
  }
}

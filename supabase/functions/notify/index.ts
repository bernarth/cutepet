// Sends the queued owner alerts. The database queues them and calls this function through pg_net
// after commit, and again every 5 minutes while a row can be retried. Calling it from outside
// only sends rows that are already queued, so it needs no JWT.

interface ClaimedNotification {
  id: number;
  destination: string;
  message: string;
  is_silent: boolean;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const secretKey: string = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? '';
const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

const knownTelegramErrors: Record<string, string> = {
  'chat not found': 'El chat no existe o la persona no envió /start al bot',
  'bot was blocked by the user': 'La persona bloqueó el bot',
  Unauthorized: 'El token del bot no es válido',
};

async function callRpc(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: secretKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    throw new Error(`${name} failed with ${response.status}: ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

function describeTelegramError(description: string): string {
  const known = Object.entries(knownTelegramErrors).find(([text]) => description.includes(text));
  return known ? known[1] : `Telegram: ${description}`;
}

// Returns null when sent, or the error to record. Never includes the token
async function sendTelegram(notification: ClaimedNotification): Promise<string | null> {
  if (!botToken) {
    return 'Falta el secreto TELEGRAM_BOT_TOKEN';
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: notification.destination,
        text: notification.message,
        parse_mode: 'HTML',
        disable_notification: notification.is_silent,
        link_preview_options: { is_disabled: true },
      }),
    });

    if (response.ok) {
      return null;
    }

    const body = await response.json().catch(() => ({}));
    return describeTelegramError(body.description ?? `HTTP ${response.status}`);
  } catch {
    return 'Telegram no respondió';
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const claimed = (await callRpc('claim_notifications')) as ClaimedNotification[];
    let failed = 0;

    for (const notification of claimed) {
      const error = await sendTelegram(notification);
      if (error) failed++;
      await callRpc('finish_notification', {
        notification_id: notification.id,
        error_message: error,
      });
    }

    return Response.json({ sent: claimed.length - failed, failed });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ error: 'notify failed' }, { status: 500 });
  }
});

/**
 * POST /api/error-report
 *
 * Endpoint server-side que recibe errores del cliente (error boundaries,
 * window.onerror, etc.) y los reenvía a Discord.
 *
 * La URL del webhook se mantiene **servidor-privada** (DISCORD_ERROR_WEBHOOK_URL).
 * El cliente solo conoce este endpoint interno.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordErrorNotification } from '@/lib/discord-error';

export async function POST(request: NextRequest) {
  // Solo notificar en producción/staging para evitar spam en desarrollo
  const env = process.env.NODE_ENV ?? 'development';
  if (!['production', 'staging'].includes(env)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = await request.json();

    await sendDiscordErrorNotification({
      errorType: body.errorType ?? 'runtime',
      message: body.message ?? 'Error desconocido',
      stack: body.stack,
      location: body.location,
      extra: body.extra,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // No re-throw — no queremos loops de error reportando errores
    console.error('[error-report] Falló el envío a Discord:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

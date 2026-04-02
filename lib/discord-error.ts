/**
 * discord-error.ts
 *
 * Utilidad SERVER-SIDE para enviar notificaciones de error a Discord.
 * Nunca importar este módulo desde código de cliente.
 *
 * Usado por: app/api/error-report/route.ts
 */

export interface DiscordErrorPayload {
  /** Tipo de error: 'runtime' | 'api' | 'build' | 'unhandled' */
  errorType: string;
  message: string;
  stack?: string;
  /** URL o ruta donde ocurrió */
  location?: string;
  /** Información extra libre */
  extra?: Record<string, unknown>;
}

const TIMEZONE = 'America/Hermosillo';

export async function sendDiscordErrorNotification(
  payload: DiscordErrorPayload,
): Promise<void> {
  const webhookUrl = process.env.DISCORD_ERROR_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      '[discord-error] DISCORD_ERROR_WEBHOOK_URL no está configurada.',
    );
    return;
  }

  const env = process.env.NODE_ENV ?? 'unknown';
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Frontend';
  const stackSnippet = payload.stack
    ? payload.stack.split('\n').slice(0, 8).join('\n')
    : 'Sin stack trace';

  let extraFields: object[] = [];
  if (payload.extra && Object.keys(payload.extra).length > 0) {
    extraFields = [
      {
        name: '🔎 Detalles adicionales',
        value: `\`\`\`json\n${JSON.stringify(payload.extra, null, 2).substring(0, 900)}\n\`\`\``,
      },
    ];
  }

  const body = {
    username: `${appName} — Error Monitor`,
    avatar_url: 'https://cdn.discordapp.com/embed/avatars/4.png',
    embeds: [
      {
        title: `🚨 Error [${payload.errorType.toUpperCase()}] en ${appName} [${env.toUpperCase()}]`,
        color: 0xff0000,
        fields: [
          {
            name: '🏷️ Proyecto',
            value: appName,
            inline: true,
          },
          {
            name: '🌍 Ambiente',
            value: env.toUpperCase(),
            inline: true,
          },
          {
            name: '⚠️ Tipo de Error',
            value: payload.errorType,
            inline: true,
          },
          ...(payload.location
            ? [
                {
                  name: '📍 Ubicación',
                  value: `\`${payload.location}\``,
                  inline: false,
                },
              ]
            : []),
          {
            name: '🕐 Hora',
            value: new Date().toLocaleString('es-MX', {
              timeZone: TIMEZONE,
            }),
            inline: true,
          },
          {
            name: '💬 Mensaje',
            value: payload.message.substring(0, 1024),
          },
          {
            name: '📋 Stack trace',
            value: `\`\`\`\n${stackSnippet.substring(0, 1000)}\n\`\`\``,
          },
          ...extraFields,
        ],
        footer: { text: `${appName} • Frontend Error Monitor` },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(
      `[discord-error] Discord webhook respondió ${res.status}`,
    );
  }
}

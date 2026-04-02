'use client';

import { useEffect } from 'react';
import { reportErrorToDiscord } from '@/components/error-boundary';

/**
 * app/global-error.tsx
 *
 * Se activa cuando el error ocurre dentro del layout raíz (layout.tsx).
 * Debe incluir sus propios <html> y <body> porque reemplaza el root layout.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportErrorToDiscord(error, 'runtime', {
      scope: 'global-layout',
      digest: error.digest,
      errorName: error.name,
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f0f0f',
          color: '#fafafa',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem',
            maxWidth: '480px',
          }}
        >
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>
            Error crítico
          </h1>
          <p style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
            La aplicación encontró un error que no pudo recuperarse. El equipo ya
            fue notificado.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#71717a' }}>
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Recargar aplicación
          </button>
        </div>
      </body>
    </html>
  );
}

'use client';

import { useEffect } from 'react';
import { reportErrorToDiscord } from '@/components/error-boundary';

/**
 * app/error.tsx
 *
 * Se activa cuando cualquier segmento de ruta lanza un error no manejado.
 * Next.js lo renderiza automáticamente como fallback.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportErrorToDiscord(error, 'runtime', {
      digest: error.digest,
      errorName: error.name,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-destructive">
          Algo salió mal
        </h2>
        <p className="text-muted-foreground max-w-md">
          Ocurrió un error inesperado. El equipo ya fue notificado.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Intentar nuevamente
      </button>
    </div>
  );
}

'use client';

import React from 'react';

/**
 * Reporta un error al endpoint interno /api/error-report, que a su vez lo envía a Discord.
 * Seguro para llamar desde componentes cliente — la URL del webhook nunca se expone.
 */
async function reportErrorToDiscord(
  error: Error,
  errorType: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorType,
        message: error.message,
        stack: error.stack,
        location:
          typeof window !== 'undefined' ? window.location.pathname : undefined,
        extra,
      }),
    });
  } catch {
    // Silencioso — no queremos que el reporte de errores genere más errores
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  /** Componente de fallback personalizado. Recibe el error y un callback para resetear. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Etiqueta para identificar la sección en Discord */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — captura errores de renderizado React y los notifica a Discord.
 *
 * Uso:
 * ```tsx
 * <ErrorBoundary section="Dashboard">
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportErrorToDiscord(error, 'runtime', {
      section: this.props.section ?? 'unknown',
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-6 text-center">
          <p className="text-destructive font-semibold">
            Ocurrió un error inesperado.
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
          >
            Intentar nuevamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exportar el helper para que otros módulos puedan reportar errores directamente
// ─────────────────────────────────────────────────────────────────────────────

export { reportErrorToDiscord };

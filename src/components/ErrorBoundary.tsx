import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Without a boundary, any error thrown during render or commit unmounts the
 * entire React tree and leaves a blank white page — which is what a Radix
 * `removeChild` crash did on the signup page. A boundary keeps the failure
 * contained and, just as importantly, tells the user what happened instead of
 * showing nothing.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the original console output; it is what people paste into bug reports.
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private handleReload = () => window.location.reload();

  private handleHome = () => {
    this.setState({ error: null, componentStack: null });
    window.location.href = '/';
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Se produjo un error inesperado</h1>
            <p className="text-sm text-muted-foreground">
              La página no pudo mostrarse correctamente. Sus datos no se han perdido.
              Vuelva a cargar la página o regrese al inicio.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={this.handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar página
            </Button>
            <Button variant="outline" onClick={this.handleHome}>
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
          </div>

          <details className="text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Detalles técnicos (para soporte)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-left text-xs whitespace-pre-wrap">
              {error.message}
              {componentStack}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

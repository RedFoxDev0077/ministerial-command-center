import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

function Boom(): JSX.Element {
  throw new Error('kaboom from render');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; silence it so the suite output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>contenido normal</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido normal')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    // The whole point: something is on screen, not an empty document.
    expect(screen.getByText('Se produjo un error inesperado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recargar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ir al inicio/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toBe('');
  });

  it('surfaces the error message for bug reports', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/kaboom from render/)).toBeInTheDocument();
  });
});

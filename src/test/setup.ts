import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// Radix primitives rely on browser APIs jsdom does not implement. Without these
// stubs any test that opens a Select/Dialog throws before it can assert
// anything — which is precisely what these tests exist to check.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

globalThis.DOMRect ??= class {
  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}
  top = 0; left = 0; right = 0; bottom = 0;
  toJSON() { return {}; }
  static fromRect() { return new (globalThis.DOMRect as any)(); }
} as unknown as typeof DOMRect;

Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.hasPointerCapture ??= vi.fn(() => false);
Element.prototype.setPointerCapture ??= vi.fn();
Element.prototype.releasePointerCapture ??= vi.fn();

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof matchMedia;

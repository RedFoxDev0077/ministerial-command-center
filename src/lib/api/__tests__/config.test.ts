import { describe, it, expect } from 'vitest';

/**
 * The API base URL shipped as http://localhost:3000/api once, which made the
 * deployed app call the visitor's own machine. These lock in the resolution
 * rules that replaced it.
 */
describe('API base URL resolution', () => {
  it('is relative so one build works on any host', async () => {
    const { API_BASE_URL } = await import('../config');
    expect(API_BASE_URL).toBe('/api');
    expect(API_BASE_URL).not.toContain('localhost');
    expect(API_BASE_URL).not.toMatch(/^https?:\/\/\d+\.\d+\.\d+\.\d+/);
  });

  it('derives the websocket origin from the same value', async () => {
    const { WS_BASE_URL } = await import('../config');
    // '' means socket.io uses the current origin, which is what nginx proxies.
    expect(WS_BASE_URL).toBe('');
  });
});

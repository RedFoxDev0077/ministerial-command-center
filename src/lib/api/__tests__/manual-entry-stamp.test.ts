import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The stamp upload sent its file under the field name "stampImage", but the
 * backend route uses FilesInterceptor('files', 1). Multer rejects any other
 * field name with "Unexpected field", so applying a stamp *with* an image
 * always failed while applying one *without* an image worked — which is exactly
 * how it was reported from QA.
 *
 * These lock the field name to the one the backend accepts.
 */
const post = vi.fn().mockResolvedValue({ data: { ok: true } });

vi.mock('../axios', () => ({
  axiosInstance: {
    post: (...args: unknown[]) => post(...args),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: '/api' },
  },
}));

const file = () => new File(['x'], 'sello.jpg', { type: 'image/jpeg' });

describe('applyManualEntryStamp upload contract', () => {
  beforeEach(() => post.mockClear());

  it('sends the stamp image under the field name the backend accepts', async () => {
    const { documentsApi } = await import('../documents.api');

    await documentsApi.applyManualEntryStamp('doc-1', {
      entryDate: new Date('2026-08-24T05:43:00Z'),
      entryTime: '05:43',
      stampImage: file(),
      notes: 'con sello',
    });

    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0][1] as FormData;

    // FilesInterceptor('files', 1) — this name is the contract.
    expect(body.get('files')).toBeInstanceOf(File);
    expect(body.get('stampImage')).toBeNull();
    expect(body.get('entryTime')).toBe('05:43');
    expect(body.get('notes')).toBe('con sello');
  });

  it('omits the file field entirely when no image is chosen', async () => {
    const { documentsApi } = await import('../documents.api');

    await documentsApi.applyManualEntryStamp('doc-1', {
      entryDate: new Date('2026-08-24T05:43:00Z'),
      entryTime: '05:43',
    });

    const body = post.mock.calls[0][1] as FormData;
    expect(body.get('files')).toBeNull();
    expect(body.get('entryTime')).toBe('05:43');
  });
});

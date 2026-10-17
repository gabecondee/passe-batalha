import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveProfileAvatar } from './profileAvatar';

const db = vi.hoisted(() => ({ upload: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn(), optimize: vi.fn() }));
vi.mock('@/lib/optimizePortrait', () => ({ optimizePortrait: db.optimize }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ upload: db.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` } }) }) },
  from: () => ({ update: (patch: unknown) => {
    db.update(patch);
    return { eq: (field: string, id: string) => { db.eq(field, id); return { select: () => ({ single: db.single }) }; } };
  } }),
} }));

beforeEach(() => {
  vi.clearAllMocks();
  db.upload.mockResolvedValue({ error: null });
  db.single.mockResolvedValue({ data: { id: 'one' }, error: null });
  db.optimize.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: async () => new Blob(['png'], { type: 'image/png' }) }));
  vi.stubGlobal('crypto', { randomUUID: () => 'new-version' });
});
afterEach(() => vi.unstubAllGlobals());

it('uploads a small versioned file and persists its URL for other users', async () => {
  const url = await saveProfileAvatar('one', 'data:image/png;base64,AAAA');
  expect(url).toBe('https://example.com/one/new-version.webp');
  expect(db.upload).toHaveBeenCalledWith('one/new-version.webp', expect.any(Blob), expect.objectContaining({ cacheControl: '31536000', upsert: false }));
  expect(db.update).toHaveBeenCalledWith({ avatar: url });
  expect(db.eq).toHaveBeenCalledWith('id', 'one');
});
it('does not change the profile if the file cannot be saved', async () => {
  db.upload.mockResolvedValue({ error: new Error('upload denied') });
  await expect(saveProfileAvatar('one', 'data:image/png;base64,AAAA')).rejects.toThrow('upload denied');
  expect(db.update).not.toHaveBeenCalled();
});
it('reports a failed profile write instead of confirming success', async () => {
  db.single.mockResolvedValue({ data: null, error: new Error('offline') });
  await expect(saveProfileAvatar('one', 'https://example.com/avatar.png')).rejects.toThrow('offline');
});
it('removes the shared avatar without an upload', async () => {
  expect(await saveProfileAvatar('one', null)).toBeNull();
  expect(db.update).toHaveBeenCalledWith({ avatar: null });
  expect(db.upload).not.toHaveBeenCalled();
});

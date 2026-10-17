import { describe, expect, it } from 'vitest';
import manifest from './localImageManifest.json';
import { localImageUrl } from './localImages';

describe('optimized local image URLs', () => {
  it('upgrades legacy shop and boss URLs without changing database records', () => {
    for (const [original, optimized] of Object.entries(manifest)) {
      expect(localImageUrl(original)).toBe(optimized);
      expect(optimized).toMatch(/^\/images\/optimized\/.+-[a-f0-9]{12}\.webp$/);
    }
  });
  it('preserves remote, signed and unknown URLs', () => {
    for (const url of [
      'https://example.supabase.co/storage/v1/object/public/avatars/one.png',
      'https://example.supabase.co/storage/v1/object/sign/avatars/one.png?token=abc',
      'https://example.com/images/shop/bloqueio_constancia_1x.png',
      '/images/custom.png', 'data:image/png;base64,AAAA', 'toString',
    ]) expect(localImageUrl(url)).toBe(url);
  });
});

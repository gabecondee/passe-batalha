import { describe, expect, it } from 'vitest';
import { storageImageCachePattern } from './storageImageCache';

describe('public portrait cache', () => {
  const pattern = storageImageCachePattern('https://database.supabase.co');
  it('includes portraits referenced from another project', () => {
    expect(pattern.test('https://production.supabase.co/storage/v1/object/public/avatars/one.webp')).toBe(true);
    expect(pattern.test('https://production.supabase.co/storage/v1/object/public/boss-portraits/one.webp')).toBe(true);
  });
  it('excludes private storage, APIs and unrelated hosts', () => {
    for (const url of [
      'https://production.supabase.co/storage/v1/object/sign/avatars/one.webp?token=secret',
      'https://production.supabase.co/storage/v1/object/authenticated/avatars/one.webp',
      'https://production.supabase.co/rest/v1/profiles',
      'https://production.supabase.co/auth/v1/user',
      'https://production.supabase.co/storage/v1/object/public/documents/one.pdf',
      'https://production.supabase.co.evil.test/storage/v1/object/public/avatars/one.webp',
    ]) expect(pattern.test(url)).toBe(false);
  });
  it('supports an explicitly configured custom domain', () => {
    const custom = storageImageCachePattern('https://storage.example.com');
    expect(custom.test('https://storage.example.com/storage/v1/object/public/avatars/one.webp')).toBe(true);
    expect(custom.test('https://storageXexample.com/storage/v1/object/public/avatars/one.webp')).toBe(false);
  });
});

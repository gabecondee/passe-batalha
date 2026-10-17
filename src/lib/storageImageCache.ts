/** Public portrait links can point to a different project than the database. */
export function storageImageCachePattern(configuredOrigin: string | null): RegExp {
  const origins = ['https://[a-z0-9-]+\\.supabase\\.co'];
  if (configuredOrigin) {
    const url = new URL(configuredOrigin);
    if (url.protocol === 'https:') {
      origins.push(url.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }
  }
  return new RegExp(`^(?:${origins.join('|')})/storage/v1/object/public/(?:avatars|boss-portraits)/`);
}

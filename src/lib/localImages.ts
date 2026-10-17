import manifest from './localImageManifest.json';

/** Upgrade known local URLs; remote avatars and signed URLs retain their identity. */
export function localImageUrl(url: string): string {
  return Object.prototype.hasOwnProperty.call(manifest, url)
    ? (manifest as Record<string, string>)[url]
    : url;
}

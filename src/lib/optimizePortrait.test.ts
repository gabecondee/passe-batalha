import { afterEach, describe, expect, it, vi } from 'vitest';
import { optimizePortrait } from './optimizePortrait';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockBrowser(width: number, height: number, output: Blob | null, broken = false) {
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:portrait', revokeObjectURL });
  vi.stubGlobal('Image', class {
    naturalWidth = width;
    naturalHeight = height;
    onload: () => void;
    onerror: () => void;
    set src(_: string) { if (broken) this.onerror(); else this.onload(); }
  });
  const drawImage = vi.fn();
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage }),
    toBlob: (callback: (blob: Blob | null) => void) => callback(output),
  };
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);
  return { canvas, revokeObjectURL };
}

describe('optimizePortrait', () => {
  const original = new Blob(['x'.repeat(1000)], { type: 'image/png' });
  it('reduces a large portrait while preserving its proportions', async () => {
    const compressed = new Blob(['webp'], { type: 'image/webp' });
    const { canvas, revokeObjectURL } = mockBrowser(1024, 2048, compressed);
    expect(await optimizePortrait(original)).toBe(compressed);
    expect([canvas.width, canvas.height]).toEqual([256, 512]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:portrait');
  });
  it('does not enlarge small images or replace them with larger files', async () => {
    const { canvas } = mockBrowser(100, 200, new Blob(['x'.repeat(2000)]));
    expect(await optimizePortrait(original)).toBe(original);
    expect([canvas.width, canvas.height]).toEqual([100, 200]);
  });
  it('preserves the original if the browser cannot encode the image', async () => {
    mockBrowser(1024, 1024, null);
    expect(await optimizePortrait(original)).toBe(original);
  });
  it('preserves the original and frees the URL when decoding fails', async () => {
    const { revokeObjectURL } = mockBrowser(0, 0, null, true);
    expect(await optimizePortrait(original)).toBe(original);
    expect(revokeObjectURL).toHaveBeenCalled();
  });
  it('preserves the original if object URLs are unavailable', async () => {
    vi.stubGlobal('URL', {});
    expect(await optimizePortrait(original)).toBe(original);
  });
});

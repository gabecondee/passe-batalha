/** Keep portraits small without making an upload fail on unsupported browsers. */
export async function optimizePortrait(original: Blob): Promise<Blob> {
  let objectUrl: string | undefined;
  try {
    objectUrl = URL.createObjectURL(original);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not decode portrait'));
      image.src = objectUrl;
    });
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return original;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.8);
    });
    return compressed && compressed.size < original.size ? compressed : original;
  } catch {
    return original;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

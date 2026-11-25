/** Square-crop settings: zoom ≥ 1, and x / y from 0 (left / top) to 1 (right / bottom). */
export interface Crop {
  zoom: number;
  x: number;
  y: number;
}

/** Faces are usually in the upper part of a photo. */
export const DEFAULT_CROP: Crop = { zoom: 1, x: 0.5, y: 0.3 };

/** The source rectangle of a square crop of a w×h image. */
export function cropRect(w: number, h: number, c: Crop) {
  const side = Math.min(w, h) / Math.max(1, c.zoom);
  return {
    sx: (w - side) * Math.min(1, Math.max(0, c.x)),
    sy: (h - side) * Math.min(1, Math.max(0, c.y)),
    side,
  };
}

export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded image stays usable after the URL is released.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Draws the crop onto a square canvas of the given size. */
export function drawCrop(canvas: HTMLCanvasElement, img: HTMLImageElement, c: Crop, size: number) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { sx, sy, side } = cropRect(img.naturalWidth, img.naturalHeight, c);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

/**
 * A 256×256 JPEG data URL of the crop, about 15–25 KB, small enough to keep inside the
 * instructor's document. JPEG because Safari cannot encode WebP from a canvas.
 */
export function avatarDataUrl(img: HTMLImageElement, c: Crop) {
  const canvas = document.createElement('canvas');
  drawCrop(canvas, img, c, 256);
  return canvas.toDataURL('image/jpeg', 0.82);
}

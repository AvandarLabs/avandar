/** A rectangle in frame pixels, inclusive of its top-left corner. */
export type ParityRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

/** What changed between a reference frame and the current render of it. */
export type FrameComparison = Readonly<{
  differingPixels: number;
  /** Differing pixels outside every allowed region. Parity needs zero. */
  unexplainedPixels: number;
  /** RGBA diff image: dimmed reference, amber for allowed, magenta otherwise. */
  diff: Uint8Array;
}>;

const ALLOWED_COLOR = [255, 191, 0, 255] as const;
const UNEXPLAINED_COLOR = [255, 0, 255, 255] as const;

function _isInside(regions: readonly ParityRegion[], x: number, y: number) {
  return regions.some(
    (region) =>
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height,
  );
}

/**
 * Compares two same-size RGBA frames pixel by pixel. `theme:parity` uses it
 * to prove a renderer change kept `classic` identical, with the only allowed
 * differences confined to the regions of a deliberate consolidation.
 */
export function compareRgbaFrames(
  options: Readonly<{
    reference: Uint8Array;
    current: Uint8Array;
    width: number;
    height: number;
    allowedRegions: readonly ParityRegion[];
  }>,
): FrameComparison {
  const { reference, current, width, height, allowedRegions } = options;
  const length = width * height * 4;
  if (reference.length !== length || current.length !== length) {
    throw new Error(`Both frames must be ${width}×${height} RGBA`);
  }
  const diff = new Uint8Array(length);
  let differingPixels = 0;
  let unexplainedPixels = 0;
  for (let offset = 0; offset < length; offset += 4) {
    const isSame = [0, 1, 2, 3].every(
      (channel) => reference[offset + channel] === current[offset + channel],
    );
    if (isSame) {
      const gray = Math.round(
        (reference[offset] * 0.2126 +
          reference[offset + 1] * 0.7152 +
          reference[offset + 2] * 0.0722) *
          0.3,
      );
      diff.set([gray, gray, gray, 255], offset);
      continue;
    }
    differingPixels += 1;
    const pixel = offset / 4;
    const isAllowed = _isInside(
      allowedRegions,
      pixel % width,
      Math.floor(pixel / width),
    );
    unexplainedPixels += isAllowed ? 0 : 1;
    diff.set(isAllowed ? ALLOWED_COLOR : UNEXPLAINED_COLOR, offset);
  }
  return { differingPixels, unexplainedPixels, diff };
}

/** Blur radii below this are invisible at delivery size, so no filter runs. */
const MIN_VISIBLE_BLUR = 0.25;

type Props = {
  /** Unique within the document; pass the same id to the style helper. */
  id: string;
  /** Horizontal standard deviation in pixels. */
  amount: number;
};

/**
 * An SVG filter that blurs along X only, the motion blur of a layer moving
 * sideways, for example a window whipped off the frame or a page drifting
 * under a wipe. CSS `blur()` is isotropic and would also smear the layer's
 * horizontal edges. Pair it with `getHorizontalBlurFilter`.
 */
export function HorizontalBlurFilter({ id, amount }: Props) {
  if (amount < MIN_VISIBLE_BLUR) {
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      width={0}
      height={0}
      style={{ position: "absolute" }}
    >
      <filter
        id={id}
        x="-20%"
        y="0%"
        width="140%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation={`${amount.toFixed(2)} 0`} />
      </filter>
    </svg>
  );
}

/**
 * The CSS `filter` value that applies a `HorizontalBlurFilter`, or undefined
 * when the blur is too small to see, so a resting layer is never filtered.
 */
export function getHorizontalBlurFilter(
  id: string,
  amount: number,
): string | undefined {
  return amount < MIN_VISIBLE_BLUR ? undefined : `url(#${id})`;
}

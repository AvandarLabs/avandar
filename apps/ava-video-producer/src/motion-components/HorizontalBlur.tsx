import { MIN_VISIBLE_BLUR } from "./getHorizontalBlurFilter/getHorizontalBlurFilter";
import type { ReactNode } from "react";

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
export function HorizontalBlurFilter({ id, amount }: Props): ReactNode {
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

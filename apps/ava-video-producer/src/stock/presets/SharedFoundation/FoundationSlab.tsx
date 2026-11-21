import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  piece: "left" | "right" | "continuous";
  isMask: boolean;
};

type GetFoundationSlabRightOptions = { joining: number };

type GetJoiningFoundationBoundsOptions = { joining: number; reveal: number };

/** Samples the foundation slab right for the current authored frame. */
function _getFoundationSlabRight(
  joining: Readonly<Readonly<GetFoundationSlabRightOptions>["joining"]>,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: Motion.mix({
      t: joining,
      from: 530,
      to: 480,
    }),
    y: 390,
    width: Motion.mix({
      t: joining,
      from: 350,
      to: 400,
    }),
    height: 160,
  };
}

/** Samples the joining foundation bounds for the current authored frame. */
function _getJoiningFoundationBounds({
  joining,
  reveal,
}: Readonly<GetJoiningFoundationBoundsOptions>): {
  left: { x: number; y: number; width: number; height: number };
  right: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  continuous: { x: number; y: number; width: number; height: number };
} {
  return {
    left: {
      x: 80,
      y: 390,
      width: Motion.mix({
        t: joining,
        from: 350,
        to: 400,
      }),
      height: 160,
    },
    right: _getFoundationSlabRight(joining),
    continuous: {
      x: 80,
      y: Motion.mix({
        t: reveal,
        from: 550,
        to: 390,
      }),
      width: 800,
      height: 160 * reveal,
    },
  };
}

/** A foundation section has identical visible and text-reveal geometry. */
export function FoundationSlab({
  frame,
  piece,
  isMask,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const joining = motion.ramp(
    frame,
    72,
    motion.scale(36),
    motion.travel.easing,
  );
  const reveal = motion.ramp(frame, 48, motion.scale(24));
  const geometry = _getJoiningFoundationBounds({ joining, reveal })[piece];
  return (
    <rect
      data-foundation-left={!isMask && piece === "left" ? true : undefined}
      data-foundation-right={!isMask && piece === "right" ? true : undefined}
      data-continuous-foundation={
        !isMask && piece === "continuous" ? true : undefined
      }
      {...geometry}
      fill={isMask ? undefined : tokens.color.elevated}
    />
  );
}

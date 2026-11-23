import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EnvelopeSurfaceAndAddress } from "./EnvelopeSurfaceAndAddress";
import { HandoffCopy } from "./HandoffCopy";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";

/** Complete brief, exterior address and recipient-reveal policy. */
export type Props = GraphicProps & {
  input: Input;
};

/**
 * An addressed envelope carries an opaque enclosure along one shallow handoff
 * arc.
 */
export function SealedHandoff({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const travel = motion.ramp(frame, 72, motion.scale(36), motion.travel.easing);
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M322 510 h572 l14 16 h-600 z" }}
        profile={tokens.sketch.shape}
        data-recipient-tray="arrival"
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <g
        data-envelope-body="handoff"
        transform={`translate(${Motion.mix({
          t: travel,
          from: 64,
          to: 336,
        })} ${230 - 35 * Math.sin(travel * Math.PI)})`}
      >
        <EnvelopeSurfaceAndAddress
          frame={frame}
          input={input}
          accent={accent}
          tokens={tokens}
          scales={scales}
        />
      </g>
      <HandoffCopy {...{ frame, input }} />
    </g>
  );
}

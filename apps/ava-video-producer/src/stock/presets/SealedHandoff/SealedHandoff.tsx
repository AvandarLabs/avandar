import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EnvelopeFlaps } from "./EnvelopeFlaps/EnvelopeFlaps";
import { ExteriorAddress } from "./ExteriorAddress";
import { HandoffBrief } from "./HandoffBrief/HandoffBrief";
import { HandoffCopy } from "./HandoffCopy";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";
/** Complete brief, exterior address and recipient-reveal policy. */
export type Props = GraphicProps & { input: Input };
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
        transform={`translate(${mix(travel, 64, 336)} ${230 - 35 * Math.sin(travel * Math.PI)})`}
      >
        <StockRect
          x={0}
          y={0}
          width={536}
          height={266}
          rx={scales.corner(3)}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
        <SketchedShape
          shape={{ kind: "path", d: "M0 0 L268 -84 L536 0" }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
        <HandoffBrief {...{ frame, input }} />
        <EnvelopeFlaps {...{ frame, input, accent }} />
        <ExteriorAddress {...{ frame, input }} />
      </g>
      <HandoffCopy {...{ frame, input }} />
    </g>
  );
}

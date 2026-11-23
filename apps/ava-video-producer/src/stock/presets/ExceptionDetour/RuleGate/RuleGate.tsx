import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StandardOutcome } from "../StandardOutcome";
import { RuleLabel } from "./RuleLabel";
import { SideLatch } from "./SideLatch";
import type { Props } from "../ExceptionDetour";
import type { ReactNode } from "react";
/** The normal rule stays complete while a side latch opens for one case. */
export function RuleGate({ frame, accent, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const emphasis = scales.stroke(tokens.stroke.emphasis);
  const side = input.detourSide === "above" ? -1 : 1;
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 12,
        dur: motion.hero,
        easing: motion.reveal.easing,
      })}
    >
      <RuleLabel text={input.rule.label} />
      <g data-standard-route="true">
        <SketchedShape
          shape={{ kind: "path", d: "M100 300 H880" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={emphasis}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: "M420 250 V350" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={emphasis}
      />
      <SideLatch frame={frame} side={side} />
      <StandardOutcome input={input} />
      {input.showStandardReference ? (
        <circle
          data-standard-reference="true"
          cx={865}
          cy={300}
          r={7}
          fill={tokens.color.inactive}
        />
      ) : null}
    </g>
  );
}

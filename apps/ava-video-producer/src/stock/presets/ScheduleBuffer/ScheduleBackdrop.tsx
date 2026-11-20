import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** The authored result and deadline frame one fixed schedule endpoint. */
export function ScheduleBackdrop({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <FitText
        text={input.resultLabel}
        x={40}
        y={64}
        width={880}
        fontSize={24}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.scheduleLabels.deadline}
        x={690}
        y={164}
        width={230}
        fontSize={16}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <SketchedShape
        shape={{ kind: "path", d: "M920 225 V388 M912 225 H928" }}
        profile={tokens.sketch.shape}
        data-deadline-pin="true"
        stroke={tokens.color.text}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M40 378 V388 H920" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}

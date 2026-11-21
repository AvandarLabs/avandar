import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  halfWidth: number;
};

/** Renders the meeting place and label in authored paint order. */
export function MeetingPlaceAndLabel(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M70 405 H890 M${480 - options.halfWidth} 340 V405 M${480 + options.halfWidth} 340 V405 M${470 - options.halfWidth} 340 L480 310 L${490 + options.halfWidth} 340`,
        }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.tokens.color.line}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
      <FitText
        text={options.input.meetingLabel}
        x={480}
        y={62}
        width={820}
        fontSize={16}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}

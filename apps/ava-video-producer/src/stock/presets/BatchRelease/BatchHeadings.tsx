import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";

type Props = { input: Input };

/** The dash of the dispatch boundary. */
const BOUNDARY_DASH = "6 8";
/** Intake, dispatch, and destination captions frame the batch journey. */
export function BatchHeadings({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <FitText
        text={input.intakeLabel}
        x={40}
        y={64}
        width={400}
        fontSize={20}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.destinationLabel}
        x={550}
        y={64}
        width={370}
        fontSize={20}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <FitText
        text={input.boundaryLabel}
        x={424}
        y={142}
        width={152}
        fontSize={14}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
        color={tokens.color.textMuted}
      />
      <g data-dispatch-boundary="true">
        <SketchedShape
          shape={{ kind: "path", d: "M500 200 V580" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeDasharray={BOUNDARY_DASH}
        />
      </g>
    </g>
  );
}

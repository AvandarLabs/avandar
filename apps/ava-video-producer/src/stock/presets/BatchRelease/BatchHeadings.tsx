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
      <BatchHeading text={input.intakeLabel} x={40} width={400} maxLines={2} />
      <BatchHeading
        text={input.destinationLabel}
        x={550}
        width={370}
        maxLines={3}
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

/** A heading above one side of the boundary. */
function BatchHeading({
  text,
  x,
  width,
  maxLines,
}: Readonly<{
  text: string;
  x: number;
  width: number;
  maxLines: number;
}>): ReactNode {
  return (
    <FitText
      text={text}
      x={x}
      y={64}
      width={width}
      fontSize={20}
      maxLines={maxLines}
      normalizeWhitespace
      breakLongWords
    />
  );
}

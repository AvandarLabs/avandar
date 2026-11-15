import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./FictionalConflictGlobe.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/**
 * The qualifier, symbol meaning and authored total stay present through
 * rotation.
 */
export function GlobeCopy({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.scenarioCaption}
        x={50}
        y={45}
        width={850}
        fontSize={16}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.markerMeaning}
        x={50}
        y={550}
        width={720}
        fontSize={16}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={`${input.incidents.length} ×`}
        x={890}
        y={550}
        width={100}
        fontSize={24}
        maxLines={1}
        anchor="end"
        color={STOCK.muted}
        normalizeWhitespace
      />
    </g>
  );
}

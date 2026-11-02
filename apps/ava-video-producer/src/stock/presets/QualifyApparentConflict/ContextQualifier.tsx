import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/** The joining language and qualifier follow the completed context split. */
export function ContextQualifier({ frame, input }: Readonly<Props>): ReactNode {
  const resolution = ramp(frame, 96, 24);
  return (
    <>
      <g opacity={resolution}>
        <FitText
          text={input.connectorLabel}
          x={480}
          y={460}
          width={840}
          fontSize={18}
          maxLines={1}
          anchor="middle"
          color={STOCK.mint}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <g data-qualifier="true" opacity={resolution}>
        <FitText
          text={input.qualifier}
          x={480}
          y={502}
          width={840}
          fontSize={20}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}

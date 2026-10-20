import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { JoinSourceHeadings } from "./JoinSourceHeadings";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";
/** Inputs for JoinHeadings. */
type Props = { frame: number; input: Input };

/** Result and unmatched headings belong to their distinct final regions. */
export function JoinHeadings({ frame, input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {frame < 108 ? (
        <JoinSourceHeadings frame={frame} input={input} />
      ) : (
        <FitText
          text={input.labels.result}
          x={44}
          y={125}
          width={872}
          fontSize={18}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
        />
      )}
      {input.showUnmatchedTray && frame >= 90 ? (
        <g opacity={ramp(frame, 90, 18)}>
          <FitText
            text={input.labels.unmatched}
            x={44}
            y={438}
            width={872}
            fontSize={14}
            maxLines={1}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
    </g>
  );
}

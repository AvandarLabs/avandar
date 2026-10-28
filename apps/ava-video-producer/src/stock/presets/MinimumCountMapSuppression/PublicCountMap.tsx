import { propNotEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { makePublicCellsFromInput } from "./makePublicCellsFromInput";
import { PublicReleaseTile } from "./PublicReleaseTile";
import { ReleasedCountToken } from "./ReleasedCountToken";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Public tiles and copied labels consume only sanitized release objects. */
export function PublicCountMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const cells = makePublicCellsFromInput(input);
  return (
    <g data-public-map="safe">
      <g opacity={ramp(frame, 106, 12)}>
        {cells.map((cell) => (
          <PublicReleaseTile
            key={cell.id}
            cell={cell}
            labels={input.labels}
            accent={accent}
          />
        ))}
      </g>
      {cells.filter(propNotEq("value", undefined)).map((cell) => (
        <ReleasedCountToken
          key={cell.id}
          cell={cell}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}

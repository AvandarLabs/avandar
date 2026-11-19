import { propNotEq } from "@avandar/utils";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const motion = useGraphicMotion();
  const cells = makePublicCellsFromInput(input);
  return (
    <g data-public-map="safe">
      <g opacity={motion.reveal(frame, 106)}>
        {cells.map((cell) => {
          return (
            <PublicReleaseTile
              key={cell.id}
              cell={cell}
              labels={input.labels}
              accent={accent}
            />
          );
        })}
      </g>
      {cells.filter(propNotEq("value", undefined)).map((cell) => {
        return (
          <ReleasedCountToken
            key={cell.id}
            cell={cell}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

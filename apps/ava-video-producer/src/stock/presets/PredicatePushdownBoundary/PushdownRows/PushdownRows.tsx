import { MatchingPushdownRow } from "./MatchingPushdownRow";
import { PushdownSourceRow } from "./PushdownSourceRow";
import { usePushdownRowsPresentation } from "./usePushdownRowsPresentation";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
const ROWS_CUE = 13;
const ROWS_FADE_FRAMES = 20;
/** All originals remain visible while matching copies move as complete rows. */
export function PushdownRows(props: Readonly<Props>): ReactNode {
  const presentation = usePushdownRowsPresentation(props);

  return (
    <g
      opacity={presentation.motion.ramp(
        props.frame,
        ROWS_CUE,
        presentation.motion.scale(ROWS_FADE_FRAMES),
      )}
    >
      {presentation.matches.map((row, index) => {
        return (
          <MatchingPushdownRow
            key={row.id}
            {...presentation}
            row={row}
            index={index}
          />
        );
      })}
      {props.input.rows.map((row, index) => {
        return (
          <PushdownSourceRow
            key={row.id}
            frame={props.frame}
            row={row}
            index={index}
            isRejected={!presentation.matchedRows.has(row)}
            accent={props.accent}
          />
        );
      })}
    </g>
  );
}

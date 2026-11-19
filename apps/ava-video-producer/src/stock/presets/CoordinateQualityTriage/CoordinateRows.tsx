import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { CoordinateRowSource } from "./CoordinateRowSource";
import { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Literal records retain their visible source keys beside complete row IDs. */
export function CoordinateRows({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const { rows } = makeCoordinateTriageFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {rows.map((row) => {
        return (
          <CoordinateRowSource
            key={row.id}
            row={row}
            showValues={input.showValues}
          />
        );
      })}
    </g>
  );
}

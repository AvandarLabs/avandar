import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeCoordinateTriageFromInputAndFrame } from "../makeCoordinateTriageFromInputAndFrame";
import { TriageRowToken } from "../TriageRowToken";
import { PlottedRow } from "./PlottedRow";
import type { Input } from "../CoordinateQualityTriage.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Fixed plotted coordinates retain all source-key associations after arrival.
 */
export function TriageTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { rows } = makeCoordinateTriageFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {rows.map((row) => {
        return (
          <g key={row.id}>
            {row.reason === "plotted" ? (
              <PlottedRow row={row} frame={frame} accent={accent} />
            ) : undefined}
            <TriageRowToken row={row} frame={frame} accent={accent} />
          </g>
        );
      })}
    </g>
  );
}

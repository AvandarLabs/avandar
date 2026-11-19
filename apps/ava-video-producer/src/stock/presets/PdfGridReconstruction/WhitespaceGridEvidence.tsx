import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getEvidenceFromFrame } from "./gridTiming";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** A whitespace corridor's tint before the tint strength scales it. */
const CORRIDOR_TINT = 0.25;
/** Selected structural evidence derives from the supplied grid geometry. */
export function WhitespaceGridEvidence({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const width = 400 / input.grid.columnLabels.length;
  const height = 80 + input.grid.rows.length * 64;
  const progress = getEvidenceFromFrame(frame, motion);
  return (
    <g>
      {" "}
      {input.signal === "whitespace" ? (
        <g>
          {Array.from(
            { length: input.grid.columnLabels.length - 1 },
            (_, index) => {
              return (
                <rect
                  key={`v${index}`}
                  data-whitespace-corridor={`v${index}`}
                  x={48 + (index + 1) * width}
                  y={210}
                  width={8}
                  height={height * progress}
                  fill={tokens.color.highlight}
                  fillOpacity={scales.wash(CORRIDOR_TINT)}
                />
              );
            },
          )}
          {Array.from({ length: input.grid.rows.length }, (_, index) => {
            return (
              <rect
                key={`h${index}`}
                data-whitespace-corridor={`h${index}`}
                x={52}
                y={286 + index * 64}
                width={400 * progress}
                height={8}
                fill={tokens.color.highlight}
                fillOpacity={scales.wash(CORRIDOR_TINT)}
              />
            );
          })}
        </g>
      ) : undefined}
    </g>
  );
}

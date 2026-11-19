import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["operatingEmissions"][number];
  index: number;
  unit: string;
  frame: number;
};
/** One CO2e source enters its own accounting ribbon without invented mass. */
export function OperatingEmissionRow({
  row,
  index,
  unit,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const copies: Array<[string, number, number, number, number]> = [
    [row.label, 540, 204 + index * 80, 170, 3],
    [String(row.tonnesCO2e), 730, 204 + index * 80, 180, 3],
    [unit, 730, 248 + index * 80, 180, 1],
  ];
  return (
    <g>
      {copies.map(([text, x, y, width, maxLines], ordinal) => {
        return (
          <FitText
            key={ordinal}
            text={text}
            x={x}
            y={y}
            width={width}
            fontSize={12}
            maxLines={maxLines}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      <SketchedShape
        shape={{
          kind: "path",
          d: `M540 ${264 + index * 80} H${mix(motion.ramp(frame, 60, motion.scale(48), motion.travel.easing), 540, 918)}`,
        }}
        profile={tokens.sketch.shape}
        data-operation-ribbon={row.id}
        data-tonnes={row.tonnesCO2e}
        stroke={tokens.color.highlight}
        strokeWidth={16 * (row.tonnesCO2e / 1000)}
        fill="none"
      />
    </g>
  );
}

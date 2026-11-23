import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";

type Props = {
  itemKey: Array<
    | { key: string; label: Input["labels"]["present"]; value: number }
    | { key: string; label: Input["labels"]["absent"]; value: number }
    | { key: string; label: Input["labels"]["unknown"]; value: number }
    | { key: string; label: Input["labels"]["roster"]; value: number }
  >[number]["key"];
  index: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the outline with authored geometry. */
export function ClassroomAttendanceSymbol({
  itemKey: key,
  index,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {key === "present" ? (
        <circle
          cx={39 + index * 232}
          cy={538}
          r={5}
          fill={tokens.color.positive}
        />
      ) : key === "absent" ? (
        <StockRect
          x={34 + index * 232}
          y={533}
          width={10}
          height={10}
          stroke={tokens.color.inactive}
          fill="none"
        />
      ) : key === "unknown" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M ${39 + index * 232} 532 l 6 6 l -6 6 l -6 -6 Z`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          fill="none"
        />
      ) : undefined}
    </>
  );
}

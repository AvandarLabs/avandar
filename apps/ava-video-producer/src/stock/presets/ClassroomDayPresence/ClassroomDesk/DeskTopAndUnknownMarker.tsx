import { Text } from "../../../graphics-common/Text";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";

type ParentProps = {
  desk: Desk;
  transition: number;
  accent: string;
  input: Input;
  activeIndex: number;
};

type Desk = Input["learners"][number] & DeskResult;

/** Data for Desk. */
type DeskResult = {
  x: number;
  y: number;
  state: Input["days"][number]["records"][number]["state"];
  previousState: Input["days"][number]["records"][number]["state"];
};

type Props = {
  desk: Readonly<ParentProps>["desk"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  unknown: number;
};

/** Renders the desk top and unknown marker in authored paint order. */
export function DeskTopAndUnknownMarker(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.unknown > 0 ? (
        <g data-unknown-marker={options.desk.id} opacity={options.unknown}>
          <Text
            x={options.desk.x}
            y={options.desk.y - 8}
            anchor="middle"
            fill={options.tokens.color.highlight}
          >
            ?
          </Text>
        </g>
      ) : undefined}
      <StockRect
        data-desk-top={options.desk.id}
        x={options.desk.x - 46}
        y={options.desk.y + 24}
        width={92}
        height={16}
        rx={options.scales.corner(options.tokens.corner.chip)}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.inactive}
      />
    </>
  );
}

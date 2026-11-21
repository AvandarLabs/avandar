import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
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
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  occupied: number;
};

/** Renders the learner silhouette in authored paint order. */
export function LearnerSilhouette(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={options.desk.x - 12}
        y={options.desk.y - 6}
        width={28}
        height={38}
        rx={options.scales.corner(7)}
        fill="none"
        stroke={options.tokens.color.inactive}
        strokeDasharray={
          options.desk.state === "unknown"
            ? options.atomic.dash.dense.join(" ")
            : undefined
        }
      />
      <g data-learner-silhouette={options.desk.id} opacity={options.occupied}>
        <PersonGlyph
          x={options.desk.x}
          y={options.desk.y + 12 * (1 - options.occupied)}
          size={38}
          posture="seated"
          color={options.accent}
        />
      </g>
    </>
  );
}

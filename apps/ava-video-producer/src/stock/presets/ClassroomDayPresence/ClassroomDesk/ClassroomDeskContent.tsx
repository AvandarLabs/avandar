import { ClassroomImpressions } from "../ClassroomImpressions/ClassroomImpressions";
import { DeskLegsAndCaption } from "./DeskLegsAndCaption";
import { DeskTopAndUnknownMarker } from "./DeskTopAndUnknownMarker";
import { LearnerSilhouette } from "./LearnerSilhouette";
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

type GetClassroomDeskOccupiedAndUnknownResult = {
  occupied: number;
  unknown: number;
};

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
  input: Readonly<ParentProps>["input"];
  activeIndex: Readonly<ParentProps>["activeIndex"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  occupied: GetClassroomDeskOccupiedAndUnknownResult["occupied"];
  unknown: GetClassroomDeskOccupiedAndUnknownResult["unknown"];
};

/** Renders the classroom desk content in authored paint order. */
export function ClassroomDeskContent(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-desk={options.desk.id}
      data-state={options.desk.state}
      data-x={options.desk.x}
      data-y={options.desk.y}
    >
      <LearnerSilhouette
        desk={options.desk}
        accent={options.accent}
        tokens={options.tokens}
        atomic={options.atomic}
        scales={options.scales}
        occupied={options.occupied}
      />
      <DeskTopAndUnknownMarker
        desk={options.desk}
        tokens={options.tokens}
        scales={options.scales}
        unknown={options.unknown}
      />
      <DeskLegsAndCaption desk={options.desk} tokens={options.tokens} />
      <ClassroomImpressions
        input={options.input}
        learnerId={options.desk.id}
        x={options.desk.x}
        y={options.desk.y + 109}
        activeIndex={options.activeIndex}
      />
    </g>
  );
}

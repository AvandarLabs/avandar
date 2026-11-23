import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClassroomDeskContent } from "./ClassroomDeskContent";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";

/** Data for Desk. */
type DeskResult = {
  x: number;
  y: number;
  state: Input["days"][number]["records"][number]["state"];
  previousState: Input["days"][number]["records"][number]["state"];
};

type Desk = Input["learners"][number] & DeskResult;

type Props = {
  desk: Desk;
  transition: number;
  accent: string;
  input: Input;
  activeIndex: number;
};

type OccupiedAndUnknownOptions = {
  desk: Readonly<Props>["desk"];
  transition: Readonly<Props>["transition"];
};

type OccupiedAndUnknownResult = {
  occupied: number;
  unknown: number;
};

/**
 * Samples the classroom desk occupied and unknown for the current authored
 * frame.
 */
function _getClassroomDeskOccupiedAndUnknown({
  desk,
  transition,
}: Readonly<OccupiedAndUnknownOptions>): OccupiedAndUnknownResult {
  const occupied = Motion.mix({
    t: transition,
    from: Number(desk.previousState === "present"),
    to: Number(desk.state === "present"),
  });
  const unknown = Motion.mix({
    t: transition,
    from: Number(desk.previousState === "unknown"),
    to: Number(desk.state === "unknown"),
  });
  return { occupied, unknown };
}

/**
 * One silhouette per learner occupies only that learner's persistent named
 * desk.
 */
export function ClassroomDesk({
  desk,
  transition,
  accent,
  input,
  activeIndex,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { occupied, unknown } = _getClassroomDeskOccupiedAndUnknown({
    desk,
    transition,
  });
  return (
    <ClassroomDeskContent
      desk={desk}
      accent={accent}
      input={input}
      activeIndex={activeIndex}
      tokens={tokens}
      atomic={atomic}
      scales={scales}
      occupied={occupied}
      unknown={unknown}
    />
  );
}

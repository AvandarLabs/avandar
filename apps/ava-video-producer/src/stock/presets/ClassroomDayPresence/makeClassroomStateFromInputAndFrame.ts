import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import type { Input } from "./ClassroomDayPresence.schema";
/** Data for makeClassroomStateFromInputAndFrame. */
type CreateClassroomStateResult = {
  activeIndex: number;
  transition: number;
  desks: Array<{
    state: "unknown" | "absent" | "present";
    previousState: "unknown" | "absent" | "present";
    x: number;
    y: number;
    id: string;
    label: string;
  }>;
  day: {
    id: string;
    label: string;
    records: Array<{
      learnerId: string;
      state: "unknown" | "absent" | "present";
    }>;
  };
};

/**
 * Editorial day transitions preserve the same roster and fixed desk positions.
 */
export function makeClassroomStateFromInputAndFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): CreateClassroomStateResult {
  const activeIndex =
    input.days.length === 3 && frame >= 98 ? 2 : frame >= 52 ? 1 : 0;
  const transition = activeIndex
    ? ramp(frame, activeIndex === 1 ? 52 : 98, 12)
    : 1;
  const previous = input.days[Math.max(0, activeIndex - 1)],
    day = input.days[activeIndex];
  const horseshoe = [
    { x: 120, y: 170 },
    { x: 120, y: 315 },
    { x: 260, y: 410 },
    { x: 406, y: 410 },
    { x: 552, y: 410 },
    { x: 698, y: 410 },
    { x: 840, y: 315 },
    { x: 840, y: 170 },
  ];
  const desks = input.learners.map((learner, index) => {
    const position =
      input.deskLayout === "horseshoe"
        ? horseshoe[Math.round((index * 7) / (input.learners.length - 1))]
        : { x: 135 + (index % 4) * 230, y: 190 + Math.floor(index / 4) * 180 };
    return {
      ...learner,
      ...position,
      state: day.records.find(propEq("learnerId", learner.id))!.state,
      previousState: previous.records.find(propEq("learnerId", learner.id))!
        .state,
    };
  });
  return { activeIndex, transition, desks, day };
}

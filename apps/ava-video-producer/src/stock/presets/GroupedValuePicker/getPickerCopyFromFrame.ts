import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { getPickerDestinationsFromInput } from "./getPickerDestinationsFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";

type Params = {
  input: Input;
  index: number;
  frame: number;
  groups: readonly PickerValueGroup[];
  motion: VideoMotion;
};
/** Data for getPickerCopyFromFrame. */
type GetPickerCopyFromFrameResult = {
  id: string;
  text: string;
  x: number;
  y: number;
  height: number;
  opacity: number;
};

/** Frames a copy takes to rise out of its tile. */
const DEPART_FRAMES = 14;
/** Frames a copy takes to cross to its column. */
const CROSS_FRAMES = 10;
/** Frames a copy takes to fold into its bay or operand line. */
const ARRIVE_FRAMES = 12;
/** Frames a copy takes to appear. */
const APPEAR_FRAMES = 3;
/** Frames a copy takes to fold away into the formula. */
const FOLD_FRAMES = 5;

/** Value-bearing copies depart vertically, then fold into their exact bay. */
export function getPickerCopyFromFrame({
  input,
  index,
  frame,
  groups,
  motion,
}: Readonly<Params>): GetPickerCopyFromFrameResult | undefined {
  const observation = input.observations[index],
    isMode = input.rule === "most-frequent";
  const destinations = getPickerDestinationsFromInput({ input, groups });
  const destination = destinations.find(propEq("index", index));
  if (!destination) {
    return undefined;
  }
  // Cards in a reused column retain their final vertical order during arrival.
  const laneRank =
    isMode && groups.length > 3
      ? [...destinations]
          .sort((first, second) => {
            return first.y - second.y || first.index - second.index;
          })
          .findIndex(propEq("index", index))
      : index;
  const sourceX =
    observation.value === null ? 168 + index * 144 : 56 + index * 144;
  const sourceY = observation.value === null ? 180 : 224;
  const travel = motion.travel.easing;
  const departure = ramp(frame, 56, motion.scale(DEPART_FRAMES), travel),
    horizontal = ramp(frame, 70, motion.scale(CROSS_FRAMES), travel),
    arrival = ramp(frame, 80, motion.scale(ARRIVE_FRAMES), travel);
  const stagingY = 330 + laneRank * 36;
  return {
    id: observation.id,
    text: observation.value === null ? "∅" : String(observation.value),
    x: mix(horizontal, sourceX, destination.x),
    y: mix(departure, sourceY, stagingY) + (destination.y - stagingY) * arrival,
    height: observation.value === null ? 18 : 34,
    opacity:
      ramp(frame, 56, motion.scale(APPEAR_FRAMES), motion.reveal.easing) *
      (isMode
        ? 1
        : 1 - ramp(frame, 100, motion.scale(FOLD_FRAMES), motion.exit.easing)),
  };
}

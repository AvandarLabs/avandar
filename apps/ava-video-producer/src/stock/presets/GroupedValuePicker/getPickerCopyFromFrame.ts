import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { getPickerDestinationsFromInput } from "./getPickerDestinationsFromInput";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";

type PickerCopyTravelOptions = {
  frame: number;
  motion: VideoMotion;
  travel: VideoMotion["travel"]["easing"];
};
/** Samples departure, crossing and arrival on the authored copy cues. */
function _getPickerCopyTravel({
  frame,
  motion,
  travel,
}: Readonly<PickerCopyTravelOptions>): {
  departure: number;
  horizontal: number;
  arrival: number;
} {
  const departure = Motion.ramp({
      frame,
      at: 56,
      dur: motion.scale(DEPART_FRAMES),
      easing: travel,
    }),
    horizontal = Motion.ramp({
      frame,
      at: 70,
      dur: motion.scale(CROSS_FRAMES),
      easing: travel,
    }),
    arrival = Motion.ramp({
      frame,
      at: 80,
      dur: motion.scale(ARRIVE_FRAMES),
      easing: travel,
    });
  return { departure, horizontal, arrival };
}

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

/** Samples the copy appearance and its optional fold into the formula. */
function _getPickerCopyOpacityFromFrame({
  frame,
  motion,
  isMode,
}: Readonly<GetPickerCopyOpacityFromFrameOptions>): number {
  return (
    Motion.ramp({
      frame,
      at: 56,
      dur: motion.scale(APPEAR_FRAMES),
      easing: motion.reveal.easing,
    }) *
    (isMode
      ? 1
      : 1 -
        Motion.ramp({
          frame,
          at: 100,
          dur: motion.scale(FOLD_FRAMES),
          easing: motion.exit.easing,
        }))
  );
}

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
  const { departure, horizontal, arrival } = _getPickerCopyTravel({
    frame,
    motion,
    travel,
  });
  const stagingY = 330 + laneRank * 36;
  return {
    id: observation.id,
    text: observation.value === null ? "∅" : String(observation.value),
    x: Motion.mix({ t: horizontal, from: sourceX, to: destination.x }),
    y:
      Motion.mix({ t: departure, from: sourceY, to: stagingY }) +
      (destination.y - stagingY) * arrival,
    height: observation.value === null ? 18 : 34,
    opacity: _getPickerCopyOpacityFromFrame({ frame, motion, isMode }),
  };
}

type GetPickerCopyOpacityFromFrameOptions = {
  frame: number;
  motion: VideoMotion;
  isMode: boolean;
};

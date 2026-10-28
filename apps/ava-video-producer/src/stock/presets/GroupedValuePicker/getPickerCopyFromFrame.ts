import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { getPickerDestinationsFromInput } from "./getPickerDestinationsFromInput";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
type Params = {
  input: Input;
  index: number;
  frame: number;
  groups: readonly PickerValueGroup[];
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

/** Value-bearing copies depart vertically, then fold into their exact bay. */
export function getPickerCopyFromFrame({
  input,
  index,
  frame,
  groups,
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
          .sort(
            (first, second) => first.y - second.y || first.index - second.index,
          )
          .findIndex(propEq("index", index))
      : index;
  const sourceX =
    observation.value === null ? 168 + index * 144 : 56 + index * 144;
  const sourceY = observation.value === null ? 180 : 224;
  const departure = ramp(frame, 56, 14, EASE.inOut),
    horizontal = ramp(frame, 70, 10, EASE.inOut),
    arrival = ramp(frame, 80, 12, EASE.inOut);
  const stagingY = 330 + laneRank * 36;
  return {
    id: observation.id,
    text: observation.value === null ? "∅" : String(observation.value),
    x: mix(horizontal, sourceX, destination.x),
    y: mix(departure, sourceY, stagingY) + (destination.y - stagingY) * arrival,
    height: observation.value === null ? 18 : 34,
    opacity: ramp(frame, 56, 3) * (isMode ? 1 : 1 - ramp(frame, 100, 5)),
  };
}

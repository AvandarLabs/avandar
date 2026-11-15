import { propEq } from "@avandar/utils";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
/**
 * Locate each participating value in its final stack or numeric operand line.
 */
export function getPickerDestinationsFromInput({
  input,
  groups,
}: Readonly<{ input: Input; groups: readonly PickerValueGroup[] }>): Array<{
  index: number;
  x: number;
  y: number;
}> {
  const isMode = input.rule === "most-frequent";
  const observations = input.observations
    .map((observation, index) => ({ ...observation, index }))
    .filter(
      ({ value }) =>
        input.rule !== "first" &&
        (value !== null || (isMode && input.nullPolicy === "include-in-mode")),
    );
  return observations.map(({ value, index }, position) => {
    const group = groups.find(propEq("value", value));
    const rank = observations
      .slice(0, position)
      .filter((candidate) => !isMode || candidate.value === value).length;
    return {
      index,
      x: isMode && group ? group.x + 8 : 56 + rank * 144,
      y:
        isMode && group
          ? group.y +
            (value === null ? 100 : 60) +
            rank * (value === null ? 20 : 36)
          : 365,
    };
  });
}

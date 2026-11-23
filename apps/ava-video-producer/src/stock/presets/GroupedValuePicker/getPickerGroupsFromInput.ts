import { isNonNullish, prop } from "@avandar/utils";
import type { Input } from "./GroupedValuePicker.schema";
/** A value group owns a disjoint stack bay and all of its repeated values. */
export type PickerValueGroup = {
  value: number | null;
  count: number;
  x: number;
  y: number;
  height: number;
};

/**
 * Counts candidates and preserves the numeric-then-null frequency tie break.
 */
function _countPickerCandidatesFromValues({
  candidates,
  values,
}: Readonly<CountPickerCandidatesFromValuesOptions>): Array<{
  value: number | null;
  count: number;
}> {
  return candidates
    .map((value) => {
      return {
        value,
        count: values.filter((candidate) => {
          return candidate === value;
        }).length,
      };
    })
    .sort((first, second) => {
      return (
        second.count - first.count ||
        (first.value === null
          ? 1
          : second.value === null
            ? -1
            : first.value - second.value)
      );
    });
}

/** Arrange frequency groups in bounded bays with room for complete values. */
export function getPickerGroupsFromInput(
  input: Readonly<Input>,
): PickerValueGroup[] {
  const values = input.observations.map(prop("value"));
  const candidates = [
    ...new Set(
      input.nullPolicy === "include-in-mode"
        ? values
        : values.filter(isNonNullish),
    ),
  ];
  const counted = _countPickerCandidatesFromValues({ candidates, values });
  return counted.reduce<{ bottoms: number[]; groups: PickerValueGroup[] }>(
    (layout, group) => {
      const column = layout.bottoms.indexOf(Math.min(...layout.bottoms));
      const height =
        group.value === null ? 88 + group.count * 20 : 48 + group.count * 36;
      layout.groups.push({
        ...group,
        x: 50 + column * 185,
        y: layout.bottoms[column],
        height,
      });
      layout.bottoms[column] += height + 10;
      return layout;
    },
    { bottoms: [330, 330, 330], groups: [] },
  ).groups;
}

type CountPickerCandidatesFromValuesOptions = {
  candidates: ReadonlyArray<number | null>;
  values: ReadonlyArray<number | null>;
};

import { prop } from "@avandar/utils";
import type { Input } from "./GroupedValuePicker.schema";
/** A value group owns a disjoint stack bay and all of its repeated values. */
export type PickerValueGroup = {
  value: number | null;
  count: number;
  x: number;
  y: number;
  height: number;
};
/** Arrange frequency groups in bounded bays with room for complete values. */
export function getPickerGroupsFromInput(
  input: Readonly<Input>,
): PickerValueGroup[] {
  const values = input.observations.map(prop("value"));
  const candidates = [
    ...new Set(
      input.nullPolicy === "include-in-mode"
        ? values
        : values.filter((value) => value !== null),
    ),
  ];
  const counted = candidates
    .map((value) => ({
      value,
      count: values.filter((candidate) => candidate === value).length,
    }))
    .sort(
      (first, second) =>
        second.count - first.count ||
        (first.value === null
          ? 1
          : second.value === null
            ? -1
            : first.value - second.value),
    );
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

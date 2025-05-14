import { ReactNode } from "react";
import type { SegmentedControlItem } from ".";
import type { UnknownObject } from "@/lib/types/common";

/**
 * Given a list of objects, conver this to a list of objects with `value`
 * `label`, and `isDisabled` properties. Usable in a `SegmentedControl`
 * component.
 *
 * @param list The list of items to convert to SegmentedControlItems.
 * @param options The options for creating the segmented control items.
 * @param options.valueFn A function that returns the value for each item.
 * @param options.labelFn A function that returns the label for each item.
 * @param options.isDisabledFn A function that returns whether the item is
 * disabled.
 * @returns An array of objects with value, label, and isDisabled properties.
 */
export function makeSegmentedControlItems<
  T extends UnknownObject,
  Value extends string,
>(
  list: readonly T[],
  options: {
    valueFn: (value: T) => Value;
    labelFn?: (value: T) => ReactNode;
    isDisabledFn?: (value: T) => boolean;
  },
): Array<SegmentedControlItem<Value>> {
  const { valueFn, labelFn, isDisabledFn } = options;

  const selectOptions = list.map((item: T) => {
    const optionValue = valueFn(item);
    const optionLabel = labelFn ? labelFn(item) : optionValue;
    const isDisabled = isDisabledFn ? isDisabledFn(item) : false;

    return {
      value: optionValue,
      label: optionLabel,
      isDisabled,
    };
  });

  return selectOptions;
}

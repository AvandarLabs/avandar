import type { UnknownObject } from "@/lib/types/common";
import type { SelectOption } from "@/lib/ui/inputs/Select";

/**
 * Given a list of objects, conver this to a list of objects with `value`
 * `label`, and `isDisabled` properties. Usable in a `Select` component.
 *
 * @param list The list of items to convert to Select options.
 * @param options The options for creating the select options.
 * @param options.valueFn A function that returns the value for each option.
 * @param options.labelFn A function that returns the label for each option.
 * @param options.isDisabledFn A function that returns whether the option is
 * disabled.
 * @returns An array of objects with value, label, and isDisabled properties.
 */
export function makeSelectOptions<
  T extends UnknownObject,
  Value extends string,
>(
  list: readonly T[],
  options: {
    valueFn: (value: T) => Value;
    labelFn?: (value: T) => string;
    isDisabledFn?: (value: T) => boolean;
  },
): Array<SelectOption<Value>> {
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

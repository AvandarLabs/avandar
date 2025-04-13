import { ComboboxItem } from "@mantine/core";
import { UnknownObject } from "@/lib/types/common";

/**
 * Creates an array of objects with value, label, and isDisabled properties.
 *
 * @param options The options for creating the select options.
 * @param options.inputList The list of items to convert to Select options.
 * @param options.valueFn A function that returns the value for each list item.
 * @param options.labelFn A function that returns the label for each list item.
 * @param options.isDisabledFn A function that returns whether the option is
 * disabled.
 * @returns An array of objects with value, label, and isDisabled properties.
 */
export function makeSelectOptions<
  T extends UnknownObject,
  Value extends string,
>(options: {
  inputList: readonly T[];
  valueFn: (value: T) => Value;
  labelFn?: (value: T) => string;
  isDisabledFn?: (value: T) => boolean;
}): ComboboxItem[] {
  const { inputList, valueFn, labelFn, isDisabledFn } = options;

  const selectOptions = inputList.map((item: T) => {
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

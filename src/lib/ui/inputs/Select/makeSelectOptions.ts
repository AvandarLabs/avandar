import { ConditionalKeys } from "type-fest";
import { identity } from "@/lib/utils/misc";
import type { UnknownObject } from "@/lib/types/common";
import type { SelectOption } from "@/lib/ui/inputs/Select";

/**
 * Given a list of objects, conver this to a list of objects with `value`
 * `label`, and `isDisabled` properties. Usable in a `Select` component.
 *
 * @param list The list of items to convert to Select options.
 * @param options The options for creating the select options.
 * @param options.valueKey The key to use as the value for each option. If
 * provided, then `valueFn` is ignored.
 * @param options.valueFn A function that returns the value for each option.
 * @param options.labelKey The key to use as the label for each option. If
 * provided, then `labelFn` is ignored.
 * @param options.labelFn A function that returns the label for each option.
 * @param options.isDisabledFn A function that returns whether the option is
 * disabled.
 * @returns An array of objects with value, label, and isDisabled properties.
 */
export function makeSelectOptions<
  T extends UnknownObject,
  ValueKey extends ConditionalKeys<T, PropertyKey> | undefined,
  Value extends undefined extends ValueKey ? string
  : Extract<T[Extract<ValueKey, PropertyKey>], string> = undefined extends (
    ValueKey
  ) ?
    string
  : Extract<T[Extract<ValueKey, PropertyKey>], string>,
>(
  list: readonly T[],
  options: {
    valueFn?: (value: T) => Value;
    valueKey?: ValueKey;
    labelKey?: ConditionalKeys<T, string>;
    labelFn?: (value: T) => string;
    isDisabledFn?: (value: T) => boolean;
  },
): Array<SelectOption<Value>> {
  const {
    valueFn = identity as (item: T) => Value,
    valueKey,
    labelKey,
    labelFn,
    isDisabledFn,
  } = options;
  const selectOptions = list.map((item: T) => {
    const optionValue = (valueKey ? item[valueKey] : valueFn(item)) as Value;
    const optionLabel = (
      labelKey ? item[labelKey]
      : labelFn ? labelFn(item)
      : optionValue) as string;
    const isDisabled = isDisabledFn ? isDisabledFn(item) : false;
    return {
      value: optionValue,
      label: optionLabel,
      disabled: isDisabled,
    };
  });
  return selectOptions;
}

import {
  Select as MantineSelect,
  SelectProps as MantineSelectProps,
} from "@mantine/core";
import { Merge } from "type-fest";

export type SelectOption<T extends NonNullable<string>> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SelectOptionGroup<T extends NonNullable<string>> = {
  group: string;
  items: ReadonlyArray<T | SelectOption<T>>;
};

export type SelectData<T extends NonNullable<string>> = ReadonlyArray<
  T | SelectOption<T> | SelectOptionGroup<T>
>;

type Props<T extends NonNullable<string>> = Merge<
  MantineSelectProps,
  {
    /**
     * Value of the select. Use this to make the component controlled.
     * `null` is intentionally allowed to match Mantine's API to represent no
     * value. We can't use `undefined` because Mantine uses `undefined` to
     * decide controlled vs. uncontrolled behavior.
     */
    value?: T | null;

    /**
     * Default value of the select. `null` is intentionally allowed to match
     * Mantine's API to represent no value. We can't use `undefined` because
     * Mantine uses `undefined` to decide controlled vs. uncontrolled behavior.
     */
    defaultValue?: T | null;

    /** Called when the value changes */
    onChange?: (value: T | null, option: SelectOption<T>) => void;

    /**
     * Called when option is submitted from dropdown with mouse click or
     * `Enter` key.
     */
    onOptionSubmit?: (value: T) => void;

    /**
     * Data used to generate options. Values must be unique, otherwise an error
     * will be thrown and the component will not render.
     */
    data?: SelectData<T>;
  }
>;

export function Select<T extends NonNullable<string>>(
  props: Props<T>,
): JSX.Element {
  return <MantineSelect {...(props as MantineSelectProps)} />;
}

export type { Props as SelectProps };

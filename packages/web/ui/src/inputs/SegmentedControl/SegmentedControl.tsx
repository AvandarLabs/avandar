import {
  SegmentedControl as MantineSegmentedControl,
  SegmentedControlItem as MantineSegmentedControlItem,
  SegmentedControlProps as MantineSegmentedControlProps,
} from "@mantine/core";

export type SegmentedControlItem<T extends NonNullable<string>> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

type Props<T extends NonNullable<string>> = Omit<
  MantineSegmentedControlProps,
  "value" | "defaultValue" | "onChange" | "data"
> & {
  /** Controlled component value */
  value?: T;

  /** Uncontrolled component default value */
  defaultValue?: T;

  /** Called when value changes */
  onChange?: (value: T) => void;

  data: ReadonlyArray<T | SegmentedControlItem<T>>;
};

export function SegmentedControl<T extends NonNullable<string>>(
  props: Props<T>,
): JSX.Element {
  const { data, ...restOfProps } = props;

  return (
    <MantineSegmentedControl
      {...(restOfProps as Omit<MantineSegmentedControlProps, "data">)}
      // Handle `data` separately to coerce the type
      data={data as unknown as Array<string | MantineSegmentedControlItem>}
    />
  );
}

export type { Props as SegmentedControlProps };

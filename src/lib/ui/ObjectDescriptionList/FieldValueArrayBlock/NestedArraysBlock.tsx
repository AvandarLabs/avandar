import { Fieldset, Stack } from "@mantine/core";
import { FieldValueArrayBlock } from ".";
import { DescribableValue, DescribableValueArrayRenderOptions } from "../types";

type Props<T extends DescribableValue> = {
  /** Array of arrays of field values */
  values: ReadonlyArray<readonly T[]>;
} & DescribableValueArrayRenderOptions<T>;

export function NestedArraysBlock<T extends DescribableValue>({
  values,
  ...renderOptions
}: Props<T>): JSX.Element | null {
  if (values.length === 0) {
    return null;
  }

  // TODO(jpsyx): use a stable key
  return (
    <Stack>
      {values.map((valueArray, idx) => {
        return (
          <Fieldset key={idx} title={`Collection ${idx + 1}`}>
            <FieldValueArrayBlock value={valueArray} {...renderOptions} />
          </Fieldset>
        );
      })}
    </Stack>
  );
}

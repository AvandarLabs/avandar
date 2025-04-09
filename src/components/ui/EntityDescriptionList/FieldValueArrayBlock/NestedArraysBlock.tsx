import { Fieldset, Stack } from "@mantine/core";
import { FieldValue, FieldValueArrayRenderOptions } from "../types";
import { FieldValueArrayBlock } from "./FieldValueArrayBlock";

type Props<T extends FieldValue> = {
  /** Array of arrays of field values */
  values: ReadonlyArray<readonly T[]>;
} & FieldValueArrayRenderOptions<T>;

export function NestedArraysBlock<T extends FieldValue>({
  values,
  ...renderOptions
}: Props<T>): JSX.Element | null {
  if (values.length === 0) {
    return null;
  }

  // TODO(pablo): use a stable key
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

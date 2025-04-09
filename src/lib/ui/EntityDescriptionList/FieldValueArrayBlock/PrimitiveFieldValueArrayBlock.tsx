import { Stack } from "@mantine/core";
import { PrimitiveFieldValueItem } from "../PrimitiveFieldValueItem";
import {
  PrimitiveFieldValue,
  PrimitiveFieldValueRenderOptions,
} from "../types";

type Props<T extends PrimitiveFieldValue> = {
  values: readonly T[];
} & PrimitiveFieldValueRenderOptions;

export function PrimitiveFieldValueArrayBlock<T extends PrimitiveFieldValue>({
  values,
  ...renderOptions
}: Props<T>): JSX.Element | null {
  if (values.length === 0) {
    return null;
  }

  // TODO(pablo): use a stable key
  return (
    <Stack>
      {values.map((v, idx) => {
        return (
          <PrimitiveFieldValueItem key={idx} value={v} {...renderOptions} />
        );
      })}
    </Stack>
  );
}

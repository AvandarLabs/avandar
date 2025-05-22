import { Stack } from "@mantine/core";
import { PrimitiveValueItem } from "../PrimitiveValueItem";
import { PrimitiveValue, PrimitiveValueRenderOptions } from "../types";

type Props<T extends PrimitiveValue> = {
  values: readonly T[];
} & PrimitiveValueRenderOptions;

export function PrimitiveFieldValueArrayBlock<T extends PrimitiveValue>({
  values,
  ...renderOptions
}: Props<T>): JSX.Element | null {
  if (values.length === 0) {
    return null;
  }

  // TODO(jpsyx): use a stable key
  return (
    <Stack>
      {values.map((v, idx) => {
        return <PrimitiveValueItem key={idx} value={v} {...renderOptions} />;
      })}
    </Stack>
  );
}

import { Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { PrimitiveValueItem } from "../PrimitiveValueItem";
import {
  GenericRootData,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "../types";

type Props<T extends PrimitiveValue, RootData extends GenericRootData> = {
  values: readonly T[];
  maxItemsCount?: number;
  rootData: RootData;
} & PrimitiveValueRenderOptions<T, RootData>;

export function PrimitiveFieldValueArrayBlock<
  T extends PrimitiveValue,
  RootData extends GenericRootData,
>({
  values,
  maxItemsCount,
  rootData,
  ...renderOptions
}: Props<T, RootData>): JSX.Element | null {
  const valuesToRender = useMemo(() => {
    return maxItemsCount === undefined ? values : (
        values.slice(0, maxItemsCount)
      );
  }, [values, maxItemsCount]);

  if (valuesToRender.length === 0) {
    return null;
  }

  const moreText =
    valuesToRender.length < values.length ?
      <Text>... and {values.length - valuesToRender.length} more</Text>
    : null;

  // TODO(jpsyx): use a stable key
  return (
    <Stack>
      {valuesToRender.map((v, idx) => {
        return (
          <PrimitiveValueItem
            key={idx}
            value={v}
            rootData={rootData}
            {...renderOptions}
          />
        );
      })}
      {moreText}
    </Stack>
  );
}

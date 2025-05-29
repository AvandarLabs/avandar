import { Fieldset, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DescribableValue, DescribableValueArrayRenderOptions } from "../types";
import { ValueItemContainer } from "../ValueItemContainer";

type Props<T extends DescribableValue> = {
  /** Array of arrays of field values */
  values: ReadonlyArray<readonly T[]>;
  maxItemsCount?: number;
} & DescribableValueArrayRenderOptions<T>;

export function NestedArraysBlock<T extends DescribableValue>({
  values,
  maxItemsCount,
  ...renderOptions
}: Props<T>): JSX.Element | null {
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
      {valuesToRender.map((valueArray, idx) => {
        return (
          <Fieldset key={idx} title={`Collection ${idx + 1}`}>
            <ValueItemContainer
              type="array"
              value={valueArray}
              {...renderOptions}
            />
          </Fieldset>
        );
      })}
      {moreText}
    </Stack>
  );
}

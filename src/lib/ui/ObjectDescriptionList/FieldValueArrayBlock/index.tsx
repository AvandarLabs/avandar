import { Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { isFieldValueArray, isPrimitiveFieldValue } from "../guards";
import {
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  PrimitiveValue,
} from "../types";
import { EntityArrayBlock } from "./EntityArrayBlock";
import { NestedArraysBlock } from "./NestedArraysBlock";
import { PrimitiveFieldValueArrayBlock } from "./PrimitiveFieldValueArrayBlock";

type Props<T extends DescribableValue> = {
  value: readonly DescribableValue[];
} & DescribableValueArrayRenderOptions<T>;

export function FieldValueArrayBlock<T extends DescribableValue>({
  value,
  emptyArray = "There are no values",
  ...moreRenderOptions
}: Props<T>): JSX.Element {
  // Split between entity objects, arrays, and primitive values
  const [entityObjects, valueArrays, primitiveValues] = useMemo(() => {
    const entities: DescribableObject[] = [];
    const arrays: Array<readonly DescribableValue[]> = [];
    const primitives: PrimitiveValue[] = [];
    value.forEach((v) => {
      if (isPrimitiveFieldValue(v)) {
        primitives.push(v);
      } else if (isFieldValueArray(v)) {
        arrays.push(v);
      } else {
        entities.push(v);
      }
    });
    return [entities, arrays, primitives];
  }, [value]);

  if (value.length === 0) {
    return <Text fs="italic">{emptyArray}</Text>;
  }

  // TODO(jpsyx): we should be passing sub options here
  return (
    <Stack>
      <PrimitiveFieldValueArrayBlock
        values={primitiveValues}
        {...moreRenderOptions}
      />

      <EntityArrayBlock values={entityObjects} {...moreRenderOptions} />

      <NestedArraysBlock values={valueArrays} {...moreRenderOptions} />
    </Stack>
  );
}

import { ScrollArea, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { pick } from "@/lib/utils/objects/misc";
import {
  isDescribableValueArray,
  isPrimitiveFieldValue,
  isStringOrNumber,
} from "../guards";
import {
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "../types";
import { NestedArraysBlock } from "./NestedArraysBlock";
import { ObjectArrayBlock } from "./ObjectArrayBlock";
import { PrimitiveFieldValueArrayBlock } from "./PrimitiveFieldValueArrayBlock";

type Props<T extends DescribableValue> = {
  data: readonly DescribableValue[];
} & DescribableValueArrayRenderOptions<T>;

/**
 * Renders an array of potentially mixed describable values, so it
 * splits it between primitive values, object values, and array values.
 */
export function DescribableValueArrayBlock<T extends DescribableValue>({
  data,
  renderEmptyArray = "There are no values",
  renderArray,
  maxHeight,
  maxItemsCount,
  ...moreRenderOptions
}: Props<T>): JSX.Element {
  // Split between entity objects, arrays, and primitive values
  const [entityObjects, valueArrays, primitiveValues] = useMemo(() => {
    const entities: DescribableObject[] = [];
    const arrays: Array<readonly DescribableValue[]> = [];
    const primitives: PrimitiveValue[] = [];
    data.forEach((v) => {
      if (isPrimitiveFieldValue(v)) {
        primitives.push(v);
      } else if (isDescribableValueArray(v)) {
        arrays.push(v);
      } else {
        entities.push(v);
      }
    });
    return [entities, arrays, primitives];
  }, [data]);

  if (data.length === 0) {
    if (isStringOrNumber(renderEmptyArray)) {
      return (
        <Text span fs="italic">
          {renderEmptyArray}
        </Text>
      );
    }
    return <>{renderEmptyArray}</>;
  }

  // compute the render options for each block
  const parentPrimitiveRenderOptions = pick(
    moreRenderOptions as PrimitiveValueRenderOptions<PrimitiveValue>,
    PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  );

  const objectArrayOrNestedArrayRenderOptions = {
    ...parentPrimitiveRenderOptions,
    ...moreRenderOptions,
  };

  const contentBlock =
    renderArray ?
      renderArray(data as readonly T[])
    : <Stack>
        <PrimitiveFieldValueArrayBlock
          values={primitiveValues}
          maxItemsCount={maxItemsCount}
          {...parentPrimitiveRenderOptions}
        />
        <ObjectArrayBlock
          values={entityObjects}
          maxItemsCount={maxItemsCount}
          {...objectArrayOrNestedArrayRenderOptions}
        />
        <NestedArraysBlock
          values={valueArrays}
          maxItemsCount={maxItemsCount}
          {...objectArrayOrNestedArrayRenderOptions}
        />
      </Stack>;

  if (maxHeight === undefined) {
    return <>{contentBlock}</>;
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      {contentBlock}
    </ScrollArea.Autosize>
  );
}

export type DescribableValueArrayBlockProps<T extends DescribableValue> =
  Props<T>;

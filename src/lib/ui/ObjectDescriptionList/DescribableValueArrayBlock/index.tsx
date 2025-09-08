import { ScrollArea, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { pick } from "@/lib/utils/objects/misc";
import {
  isDescribableValueArray,
  isPrimitiveDescribableValue,
  isStringOrNumber,
} from "../guards";
import {
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  GenericRootData,
  PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "../types";
import { NestedArraysBlock } from "./NestedArraysBlock";
import { ObjectArrayBlock } from "./ObjectArrayBlock";
import { PrimitiveFieldValueArrayBlock } from "./PrimitiveFieldValueArrayBlock";

type Props<T extends DescribableValue, RootData extends GenericRootData> = {
  data: readonly DescribableValue[];
  rootData: RootData;
} & DescribableValueArrayRenderOptions<T, RootData>;
export type { Props as DescribableValueArrayBlockProps };

/**
 * Renders an array of potentially mixed describable values, so it
 * splits it between primitive values, object values, and array values.
 */
export function DescribableValueArrayBlock<
  T extends DescribableValue,
  RootData extends GenericRootData,
>({
  data,
  rootData,
  renderEmptyArray = "There are no values",
  renderArray,
  maxHeight,
  maxItemsCount,
  ...moreRenderOptions
}: Props<T, RootData>): JSX.Element {
  // Split between objects, arrays, and primitive values
  const [describableObjects, describableValueArrays, primitiveValues] =
    useMemo(() => {
      const objs: DescribableObject[] = [];
      const arrays: Array<readonly DescribableValue[]> = [];
      const primitives: PrimitiveValue[] = [];
      data.forEach((v) => {
        if (isPrimitiveDescribableValue(v)) {
          primitives.push(v);
        } else if (isDescribableValueArray(v)) {
          arrays.push(v);
        } else {
          objs.push(v);
        }
      });
      return [objs, arrays, primitives];
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
    moreRenderOptions as PrimitiveValueRenderOptions<PrimitiveValue, RootData>,
    PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  );

  const objectArrayOrNestedArrayRenderOptions = {
    ...parentPrimitiveRenderOptions,
    ...moreRenderOptions,
  };

  const customRenderedArrayContent =
    renderArray ? renderArray(data as readonly T[], rootData) : undefined;

  const contentBlock =
    customRenderedArrayContent === undefined ?
      <Stack>
        <PrimitiveFieldValueArrayBlock
          values={primitiveValues}
          maxItemsCount={maxItemsCount}
          rootData={rootData}
          {...parentPrimitiveRenderOptions}
        />
        <ObjectArrayBlock
          values={describableObjects}
          maxItemsCount={maxItemsCount}
          rootData={rootData}
          {...objectArrayOrNestedArrayRenderOptions}
        />
        <NestedArraysBlock
          values={describableValueArrays}
          maxItemsCount={maxItemsCount}
          rootData={rootData}
          {...objectArrayOrNestedArrayRenderOptions}
        />
      </Stack>
    : customRenderedArrayContent;

  if (maxHeight === undefined) {
    return <>{contentBlock}</>;
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      {contentBlock}
    </ScrollArea.Autosize>
  );
}

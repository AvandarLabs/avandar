import { Fieldset, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { ValueItemContainer } from "@ui/ObjectDescriptionList/ValueItemContainer";
import type {
  DescribableValueArrayRenderOptions,
  GenericRootData,
  GetChildObjects,
  NestedArrayRenderOptions,
} from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";

type Props<T, RootData extends GenericRootData> = {
  /** Array of arrays of field values */
  values: ReadonlyArray<readonly T[]>;
  maxItemsCount?: number;
  rootData: RootData;

  /** Called when a value is edited and the changes are submitted */
  onSubmitChange?: (newValue: GetChildObjects<RootData>) => void;
} & NestedArrayRenderOptions<T, RootData>;

export function NestedArraysBlock<T, RootData extends GenericRootData>({
  values,
  rootData,
  onSubmitChange,
  maxItemsCount,
  itemRenderOptions,
  ...primitiveRenderValueOptions
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

  const arrayItemRenderOptions = {
    ...primitiveRenderValueOptions,
    ...itemRenderOptions,
  } as DescribableValueArrayRenderOptions<T, RootData>;

  // TODO(jpsyx): use a stable key
  return (
    <Stack>
      {valuesToRender.map((valueArray, idx) => {
        return (
          <Fieldset key={idx} title={`Collection ${idx + 1}`}>
            <ValueItemContainer
              type="array"
              value={valueArray}
              rootData={rootData}
              onSubmitChange={onSubmitChange}
              {...(arrayItemRenderOptions as DescribableValueArrayRenderOptions<
                unknown,
                RootData
              >)}
            />
          </Fieldset>
        );
      })}
      {moreText}
    </Stack>
  );
}

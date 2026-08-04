import { Trans, useLingui } from "@lingui/react/macro";
import { Fieldset, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { ValueItemContainer } from "../ValueItemContainer";
import type {
  DescribableValueArrayRenderOptions,
  GenericRootData,
  GetChildObjects,
  NestedArrayRenderOptions,
} from "../ObjectDescriptionList.types";

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
  const { t } = useLingui();
  const valuesToRender = useMemo(() => {
    return maxItemsCount === undefined ? values : (
        values.slice(0, maxItemsCount)
      );
  }, [values, maxItemsCount]);

  if (valuesToRender.length === 0) {
    return null;
  }

  const remainingCount = values.length - valuesToRender.length;
  const moreText =
    valuesToRender.length < values.length ?
      <Text>
        <Trans>... and {remainingCount} more</Trans>
      </Text>
    : null;

  const arrayItemRenderOptions = {
    ...primitiveRenderValueOptions,
    ...itemRenderOptions,
  } as DescribableValueArrayRenderOptions<T, RootData>;

  return (
    <Stack>
      {valuesToRender.map((valueArray, arrayIndex) => {
        const collectionNumber = arrayIndex + 1;
        const serializedValue = JSON.stringify(valueArray);
        const duplicateNumber = valuesToRender
          .slice(0, arrayIndex)
          .filter((priorValue) => {
            return JSON.stringify(priorValue) === serializedValue;
          }).length;
        return (
          <Fieldset
            key={`${serializedValue}:${duplicateNumber}`}
            title={t`Collection ${collectionNumber}`}
          >
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

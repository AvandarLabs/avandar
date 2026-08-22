import type {
  DescribableValueArrayRenderOptions,
  GenericRootData,
  GetChildObjects,
  NestedArrayRenderOptions,
} from "../ObjectDescriptionList.types";

import { Fieldset, Stack, Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { useMemo } from "react";

import { ValueItemContainer } from "../ValueItemContainer";

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
  const i18n = useI18nMessages();
  const valuesToRender = useMemo(() => {
    return maxItemsCount === undefined
      ? values
      : values.slice(0, maxItemsCount);
  }, [values, maxItemsCount]);

  if (valuesToRender.length === 0) {
    return null;
  }

  const remainingCount = values.length - valuesToRender.length;
  const moreText =
    valuesToRender.length < values.length ? (
      <Text>{i18n.andMore(remainingCount)}</Text>
    ) : null;

  const arrayItemRenderOptions = {
    ...primitiveRenderValueOptions,
    ...itemRenderOptions,
  } as DescribableValueArrayRenderOptions<T, RootData>;

  return (
    <Stack>
      {valuesToRender.map((valueArray, idx) => {
        const collectionNumber = idx + 1;
        const serializedValue = JSON.stringify(valueArray);
        const duplicateNumber = valuesToRender
          .slice(0, idx)
          .filter((priorValue) => {
            return JSON.stringify(priorValue) === serializedValue;
          }).length;
        return (
          <Fieldset
            key={`${serializedValue}:${duplicateNumber}`}
            title={i18n.collectionLabel(collectionNumber)}
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

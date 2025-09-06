import { ScrollArea } from "@mantine/core";
import { useMemo } from "react";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { objectKeys, pick } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import { DescriptionList } from "../DescriptionList";
import { DescribableValueArrayBlockProps } from "./DescribableValueArrayBlock";
import { isPrimitiveDescribableValue } from "./guards";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValue,
  GenericRootData,
  ObjectRenderOptions,
  PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
} from "./types";
import { ValueItemContainer } from "./ValueItemContainer";

type Props<T extends DescribableObject, RootData extends GenericRootData> = {
  data: T;
  rootData: RootData;
} & ObjectRenderOptions<NonNullable<T>, RootData>;

/**
 * This is the internal ObjectDescriptionList component which only accepts
 * objects as the data.
 */
export function ObjectDescriptionListBlock<
  T extends DescribableObject,
  RootData extends GenericRootData,
>({
  data,
  rootData,
  excludeKeys = [],
  maxHeight,
  getValue,
  renderObject,
  renderObjectKeyValue,
  renderObjectKeyLabel,
  ...renderOptions
}: Props<T, RootData>): JSX.Element {
  const excludeKeySet: ReadonlySet<StringKeyOf<T>> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  const parentPrimitiveValueRenderOptions = pick(
    renderOptions,
    PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  );

  const dataToRender = getValue ? getValue(data, rootData) : data;
  if (isPrimitiveDescribableValue(dataToRender)) {
    return (
      <ValueItemContainer
        type="primitive"
        value={dataToRender}
        rootData={rootData}
        {...parentPrimitiveValueRenderOptions}
      />
    );
  }

  const customRenderedObject =
    renderObject ? renderObject(data, rootData) : undefined;

  const contentBlock =
    customRenderedObject !== undefined ?
      // only use the customRenderedObject if it's not `undefined`, otherwise
      // we fall back to using the default DescriptionList logic
      <>{customRenderedObject}</>
    : <DescriptionList>
        {objectKeys(data).map((key) => {
          if (excludeKeySet.has(key)) {
            return null;
          }

          const customRenderedKeyContent =
            renderObjectKeyValue ?
              renderObjectKeyValue(key, data, rootData)
            : undefined;

          const customRenderedKeyLabel =
            renderObjectKeyLabel ?
              renderObjectKeyLabel(key, data, rootData)
            : undefined;

          // compute the child's render options to pass down
          const childRenderOptions = {
            ...parentPrimitiveValueRenderOptions,

            // apply the item render options
            ...(renderOptions?.itemRenderOptions ?? {}),

            // apply the child render options, which take highest priority
            ...(renderOptions?.keyRenderOptions?.[key] ?? {}),
          } as AnyDescribableValueRenderOptions;

          return (
            <DescriptionList.Item
              key={key}
              label={
                customRenderedKeyLabel === undefined ?
                  camelToTitleCase(String(key))
                : customRenderedKeyLabel
              }
            >
              {customRenderedKeyContent === undefined ?
                <ValueItemContainer
                  type="unknown"
                  value={data[key]}
                  rootData={rootData}
                  {...childRenderOptions}
                />
              : customRenderedKeyContent}
            </DescriptionList.Item>
          );
        })}
      </DescriptionList>;

  if (maxHeight === undefined) {
    return <>{contentBlock}</>;
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      {contentBlock}
    </ScrollArea.Autosize>
  );
}

type DescribableObjectProps<
  T extends DescribableObject,
  RootData extends GenericRootData,
> = Omit<Props<T, RootData>, "rootData">;
type DescribableValueArrayProps<
  T extends DescribableValue,
  RootData extends GenericRootData,
> = Omit<DescribableValueArrayBlockProps<T, RootData>, "rootData">;

/**
 * This is the root component for an `ObjectDescriptionList`. It allows
 * rendering either an object or an array of values as the top-level data.
 *
 * Technically a misnomer, because it allows both objects and arrays, but
 * for simplicity we use this as the entry point for the component so
 * users don't have to decide between using an Object-specific or Array-specific
 * component.
 */
export function ObjectDescriptionList<T extends GenericRootData>({
  data,
  ...renderOptions
}: T extends DescribableObject ? DescribableObjectProps<T, T>
: T extends ReadonlyArray<infer U extends DescribableValue> ?
  DescribableValueArrayProps<U, T>
: never): JSX.Element {
  // pass the data to `UnknownValueItem` to decide how to render things
  return (
    <ValueItemContainer
      type="unknown"
      value={data}
      rootData={data}
      {...(renderOptions as Omit<AnyDescribableValueRenderOptions, "rootData">)}
    />
  );
}

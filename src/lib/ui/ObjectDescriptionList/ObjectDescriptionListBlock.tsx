import { ScrollArea } from "@mantine/core";
import { objectKeys, pick } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import { DescriptionList } from "../DescriptionList";
import { getOrderedKeys } from "./gerOrderedKeys/getOrderedKeys";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  GenericRootData,
  ObjectRenderOptions,
  PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  PrimitiveValue,
} from "./ObjectDescriptionList.types";
import { ValueItemContainer } from "./ValueItemContainer";

type Props<T extends DescribableObject, RootData extends GenericRootData> = {
  data: T;
  rootData: RootData;
} & ObjectRenderOptions<NonNullable<T>, RootData>;
export type { Props as ObjectDescriptionListBlockProps };

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
  excludeKeys,
  includeKeys,
  excludeKeysPattern = "_",
  maxHeight,
  getRenderableValue,
  renderObject,
  renderObjectKeyValue,
  renderObjectKeyLabel,
  ...renderOptions
}: Props<T, RootData>): JSX.Element {
  const parentPrimitiveValueRenderOptions = pick(
    renderOptions,
    PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
  );

  if (getRenderableValue !== undefined) {
    const objAsPrimitiveValue =
      typeof getRenderableValue === "function" ?
        getRenderableValue(data, rootData)
      : (data[getRenderableValue] as PrimitiveValue);
    return (
      <ValueItemContainer
        type="primitive"
        value={objAsPrimitiveValue}
        rootData={rootData}
        {...parentPrimitiveValueRenderOptions}
      />
    );
  }

  const customRenderedObject =
    renderObject ? renderObject(data, rootData) : undefined;

  const orderedKeys = getOrderedKeys({
    allKeys: objectKeys(data),
    includeKeys,
    excludeKeys,
    excludeKeysPattern,
  });

  const contentBlock =
    customRenderedObject !== undefined ?
      // only use the customRenderedObject if it's not `undefined`, otherwise
      // we fall back to using the default DescriptionList logic
      <>{customRenderedObject}</>
    : <DescriptionList>
        {orderedKeys.map((key) => {
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

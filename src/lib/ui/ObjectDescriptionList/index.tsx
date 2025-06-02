import { ScrollArea } from "@mantine/core";
import { useMemo } from "react";
import { StringKeyOf } from "type-fest";
import { objectKeys, pick } from "@/lib/utils/objects/misc";
import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import { DescriptionList } from "../DescriptionList";
import { DescribableValueArrayBlockProps } from "./FieldValueArrayBlock";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValue,
  ObjectRenderOptions,
  PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
} from "./types";
import { ValueItemContainer } from "./ValueItemContainer";

type Props<T extends DescribableObject> = {
  data: T;
} & ObjectRenderOptions<NonNullable<T>>;

/**
 * This is the internal ObjectDescriptionList component which only accepts
 * objects as the data.
 */
export function ObjectDescriptionListBlock<T extends DescribableObject>({
  data,
  excludeKeys = [],
  maxHeight,
  ...renderOptions
}: Props<T>): JSX.Element {
  const excludeKeySet: ReadonlySet<StringKeyOf<T>> = useMemo(() => {
    return new Set(excludeKeys);
  }, [excludeKeys]);

  const contentBlock = (
    <DescriptionList>
      {objectKeys(data).map((key) => {
        if (excludeKeySet.has(key)) {
          return null;
        }

        // compute the child render options to pass down
        const parentPrimitiveValueRenderOptions = pick(
          renderOptions,
          PRIMITIVE_VALUE_RENDER_OPTIONS_KEYS,
        );
        const childRenderOptions: AnyDescribableValueRenderOptions = {
          ...parentPrimitiveValueRenderOptions,

          // apply the item render options
          ...(renderOptions?.itemRenderOptions ?? {}),

          // apply the child render options, which take highest priority
          ...(renderOptions?.childRenderOptions?.[key] ?? {}),
        };

        return (
          <DescriptionList.Item key={key} label={camelToTitleCase(String(key))}>
            <ValueItemContainer
              type="unknown"
              value={data[key]}
              {...childRenderOptions}
            />
          </DescriptionList.Item>
        );
      })}
    </DescriptionList>
  );

  if (maxHeight === undefined) {
    return contentBlock;
  }

  return (
    <ScrollArea.Autosize mah={maxHeight} type="auto">
      {contentBlock}
    </ScrollArea.Autosize>
  );
}

type DescribableObjectProps<T extends DescribableObject> = Props<T>;
type DescribableValueArrayProps<T extends DescribableValue> =
  DescribableValueArrayBlockProps<T>;

/**
 * This is the root component for an `ObjectDescriptionList`. It allows
 * rendering either an object or an array of values as the top-level data.
 *
 * Technically a misnomer, because it allows both objects and arrays, but
 * for simplicity we use this as the entry point for the component so
 * users don't have to decide between using an Object-specific or Array-specific
 * component.
 */
export function ObjectDescriptionList<
  T extends DescribableObject | readonly DescribableValue[],
>({
  data,
  ...renderOptions
}: T extends DescribableObject ? DescribableObjectProps<T>
: T extends ReadonlyArray<infer U extends DescribableValue> ?
  DescribableValueArrayProps<U>
: never): JSX.Element {
  // pass the data to `UnknownValueItem` to decide how to render things
  return <ValueItemContainer type="unknown" value={data} {...renderOptions} />;
}

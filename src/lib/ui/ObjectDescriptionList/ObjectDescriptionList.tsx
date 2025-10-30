import { DescribableValueArrayBlockProps } from "./DescribableValueArrayBlock";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValue,
  GenericRootData,
} from "./ObjectDescriptionList.types";
import { ObjectDescriptionListBlockProps } from "./ObjectDescriptionListBlock";
import { ValueItemContainer } from "./ValueItemContainer";

type DescribableObjectProps<
  T extends DescribableObject,
  RootData extends GenericRootData,
> = Omit<ObjectDescriptionListBlockProps<T, RootData>, "rootData">;
type DescribableValueArrayProps<
  T extends DescribableValue,
  RootData extends GenericRootData,
> = Omit<DescribableValueArrayBlockProps<T, RootData>, "rootData">;

type Props<T extends GenericRootData> =
  T extends DescribableObject ? DescribableObjectProps<T, T>
  : T extends ReadonlyArray<infer U extends DescribableValue> ?
    DescribableValueArrayProps<U, T>
  : never;

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
}: Props<T>): JSX.Element {
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

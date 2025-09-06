import { match } from "ts-pattern";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { ObjectDescriptionListBlock } from ".";
import { DescribableValueArrayBlock } from "./DescribableValueArrayBlock";
import {
  isDescribableObject,
  isDescribableValueArray,
  isPrimitiveFieldValue,
} from "./guards";
import { PrimitiveValueItem } from "./PrimitiveValueItem";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  GenericRootData,
  ObjectRenderOptions,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./types";

type Props<RootData extends GenericRootData> = {
  /**
   * The root data of the object description list. This is used to pass
   * to any custom `render` functions, like `renderValue`, `renderObject`,
   * `renderObjectKey`, or `renderArray`.
   */
  rootData: RootData;
} & (
  | ({
      type: "primitive";
      value: PrimitiveValue;
    } & PrimitiveValueRenderOptions<PrimitiveValue, RootData>)
  | ({
      type: "object";
      value: DescribableObject;
    } & ObjectRenderOptions<DescribableObject, RootData>)
  | ({
      type: "array";
      value: readonly DescribableValue[];
    } & DescribableValueArrayRenderOptions<DescribableValue, RootData>)
  | ({
      type: "unknown";
      value: DescribableValue;
    } & AnyDescribableValueRenderOptions)
);

export function ValueItemContainer<RootData extends GenericRootData>(
  props: Props<RootData>,
): JSX.Element | null {
  return match(props)
    .with(
      { type: "primitive" },
      ({ type, value, rootData, ...primitiveValueRenderOptions }) => {
        return (
          <PrimitiveValueItem
            value={value}
            rootData={rootData}
            {...primitiveValueRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "array" },
      ({ type, value, rootData, ...arrayRenderOptions }) => {
        return (
          <DescribableValueArrayBlock
            data={value}
            rootData={rootData}
            {...arrayRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "object" },
      ({ type, value, rootData, ...objectRenderOptions }) => {
        return (
          <ObjectDescriptionListBlock
            data={value}
            rootData={rootData}
            {...objectRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "unknown" },
      ({ type, value, rootData, ...renderOptions }) => {
        // if no explicit type was passed, we rely on narrowing the type from
        // the `value` itself
        if (isPrimitiveFieldValue(value)) {
          return (
            <PrimitiveValueItem
              value={value}
              rootData={rootData}
              {...renderOptions}
            />
          );
        }

        if (isDescribableValueArray(value)) {
          return (
            <DescribableValueArrayBlock
              data={value}
              rootData={rootData}
              {...renderOptions}
            />
          );
        }

        if (isDescribableObject(value)) {
          return (
            <ObjectDescriptionListBlock
              data={value}
              rootData={rootData}
              {...renderOptions}
            />
          );
        }

        return null;
      },
    )
    .exhaustive(constant(null));
}

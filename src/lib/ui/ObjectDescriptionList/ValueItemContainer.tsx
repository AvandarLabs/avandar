import { match } from "ts-pattern";
import { constant } from "@/lib/utils/higherOrderFuncs";
import { ObjectDescriptionListBlock } from ".";
import { FieldValueArrayBlock } from "./FieldValueArrayBlock";
import {
  isDescribableObject,
  isFieldValueArray,
  isPrimitiveFieldValue,
} from "./guards";
import { PrimitiveValueItem } from "./PrimitiveValueItem";
import {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValue,
  DescribableValueArrayRenderOptions,
  ObjectRenderOptions,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./types";

type Props =
  | ({
      type: "primitive";
      value: PrimitiveValue;
    } & PrimitiveValueRenderOptions)
  | ({
      type: "object";
      value: DescribableObject;
    } & ObjectRenderOptions<DescribableObject>)
  | ({
      type: "array";
      value: readonly DescribableValue[];
    } & DescribableValueArrayRenderOptions<DescribableValue>)
  | ({
      type: "unknown";
      value: DescribableValue;
    } & AnyDescribableValueRenderOptions);

export function ValueItemContainer(props: Props): JSX.Element | null {
  return match(props)
    .with(
      { type: "primitive" },
      ({ type, value, ...primitiveValueRenderOptions }) => {
        return (
          <PrimitiveValueItem value={value} {...primitiveValueRenderOptions} />
        );
      },
    )
    .with({ type: "array" }, ({ type, value, ...arrayRenderOptions }) => {
      return <FieldValueArrayBlock data={value} {...arrayRenderOptions} />;
    })
    .with({ type: "object" }, ({ type, value, ...objectRenderOptions }) => {
      return (
        <ObjectDescriptionListBlock data={value} {...objectRenderOptions} />
      );
    })
    .with({ type: "unknown" }, ({ type, value, ...renderOptions }) => {
      // if no explicit type was passed, we rely on narrowing the type from
      // the `value` itself
      if (isPrimitiveFieldValue(value)) {
        return <PrimitiveValueItem value={value} {...renderOptions} />;
      }

      if (isFieldValueArray(value)) {
        return <FieldValueArrayBlock data={value} {...renderOptions} />;
      }

      if (isDescribableObject(value)) {
        return <ObjectDescriptionListBlock data={value} {...renderOptions} />;
      }

      return null;
    })
    .exhaustive(constant(null));
}

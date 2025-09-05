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
  ObjectRenderOptions,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./types";

type Props =
  | ({
      type: "primitive";
      value: PrimitiveValue;
    } & PrimitiveValueRenderOptions<PrimitiveValue>)
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
      return (
        <DescribableValueArrayBlock
          data={value}
          {...(arrayRenderOptions as DescribableValueArrayRenderOptions<
            DescribableValue[]
          >)}
        />
      );
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
        return (
          <PrimitiveValueItem
            value={value}
            {...(renderOptions as PrimitiveValueRenderOptions<PrimitiveValue>)}
          />
        );
      }

      if (isDescribableValueArray(value)) {
        return (
          <DescribableValueArrayBlock
            data={value}
            {...(renderOptions as DescribableValueArrayRenderOptions<
              DescribableValue[]
            >)}
          />
        );
      }

      if (isDescribableObject(value)) {
        return (
          <ObjectDescriptionListBlock
            data={value}
            {...(renderOptions as ObjectRenderOptions<DescribableObject>)}
          />
        );
      }

      return null;
    })
    .exhaustive(constant(null));
}

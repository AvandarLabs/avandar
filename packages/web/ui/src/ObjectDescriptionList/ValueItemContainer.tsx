import { constant } from "@avandar/utils";
import { Text } from "@mantine/core";
import { match } from "ts-pattern";
import { DescribableValueArrayBlock } from "./DescribableValueArrayBlock/index";
import {
  isDescribableObject,
  isDescribableValueArray,
  isPrimitiveDescribableValue,
} from "./guards";
import { ObjectDescriptionListBlock } from "./ObjectDescriptionListBlock";
import { PrimitiveValueItem } from "./PrimitiveValueItem/PrimitiveValueItem";
import type {
  AnyDescribableValueRenderOptions,
  DescribableObject,
  DescribableValueArrayRenderOptions,
  GenericRootData,
  GetChildObjects,
  ObjectRenderOptions,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./ObjectDescriptionList.types";

type Props<RootData extends GenericRootData> = {
  /**
   * The root data of the object description list. This is used to pass
   * to any custom `render` functions, like `renderValue`, `renderObject`,
   * `renderObjectKey`, or `renderArray`.
   */
  rootData: RootData;

  /**
   * The object this value is a key of, such as the row a table cell sits
   * in. A primitive value passes it to its `renderValue` and
   * `renderEditableValue`.
   */
  parentObject?: DescribableObject;

  /** Whether to render the value in edit mode. */
  editMode?: boolean;

  /** Called when a value changes. */
  onChange?: (value: unknown) => void;

  /** Called when a value is edited and the changes are submitted */
  onSubmitChange?: (newValue: GetChildObjects<RootData>) => void;
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
      value: readonly unknown[];
    } & DescribableValueArrayRenderOptions<unknown, RootData>)
  | ({
      type: "unknown";
      value: unknown;
    } & AnyDescribableValueRenderOptions)
);

/**
 * A generic component that renders a value of any type. This is useful for when
 * we don't know exactly what subcomponent to render. It inspects the type of
 * the value to call the appropriate subcomponent.
 */
export function ValueItemContainer<RootData extends GenericRootData>(
  props: Props<RootData>,
): JSX.Element | null {
  return match(props)
    .with(
      { type: "primitive" },
      ({
        type,
        value,
        rootData,
        parentObject,
        onChange,
        ...primitiveValueRenderOptions
      }) => {
        return (
          <PrimitiveValueItem
            value={value}
            onChange={onChange}
            rootData={rootData}
            parentObject={parentObject}
            {...primitiveValueRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "array" },
      ({
        type,
        value,
        rootData,
        parentObject,
        onSubmitChange,
        ...arrayRenderOptions
      }) => {
        return (
          <DescribableValueArrayBlock
            data={value}
            rootData={rootData}
            onSubmitChange={onSubmitChange}
            {...arrayRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "object" },
      ({
        type,
        value,
        rootData,
        parentObject,
        onSubmitChange,
        ...objectRenderOptions
      }) => {
        return (
          <ObjectDescriptionListBlock
            data={value}
            rootData={rootData}
            onSubmitChange={onSubmitChange}
            {...objectRenderOptions}
          />
        );
      },
    )
    .with(
      { type: "unknown" },
      ({
        type,
        value,
        rootData,
        parentObject,
        editMode,
        onChange,
        onSubmitChange,
        ...renderOptions
      }) => {
        // if no explicit type was passed, we rely on narrowing the type from
        // the `value` itself
        if (isPrimitiveDescribableValue(value)) {
          return (
            <PrimitiveValueItem
              editMode={editMode}
              value={value}
              onChange={onChange}
              rootData={rootData}
              parentObject={parentObject}
              {...renderOptions}
            />
          );
        }

        if (isDescribableValueArray(value)) {
          return (
            <DescribableValueArrayBlock
              data={value}
              rootData={rootData}
              onSubmitChange={onSubmitChange}
              {...renderOptions}
            />
          );
        }

        if (isDescribableObject(value)) {
          return (
            <ObjectDescriptionListBlock
              data={value}
              rootData={rootData}
              onSubmitChange={onSubmitChange}
              {...renderOptions}
            />
          );
        }

        // otherwise, we do our best by just casting to a string
        return <Text>{String(value)}</Text>;
      },
    )
    .exhaustive(constant(null));
}

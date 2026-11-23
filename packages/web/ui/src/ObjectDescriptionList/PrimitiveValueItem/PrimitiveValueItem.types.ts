import type {
  GenericRootData,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "../ObjectDescriptionList.types";

export type PrimitiveValueItemProps<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
> = {
  /** The value to render. */
  value: T;

  /** Whether to render the value in edit mode. */
  editMode?: boolean;

  /** Called when the value changes in edit mode. */
  onChange?: (value: T) => void;

  /**
   * Data that gets passed into the `renderValue` function, if provided.
   * This prop gets auto-filled when this component is used recursively
   * within an `ObjectDescriptionList` hierarchy.
   *
   * If `PrimitiveValueItem` is being used directly, outsiede of an
   * `ObjectDescriptionList` hierarchy, this prop does not need to be
   * passed in.
   */
  rootData?: RootData;
} & PrimitiveValueRenderOptions<T, RootData>;

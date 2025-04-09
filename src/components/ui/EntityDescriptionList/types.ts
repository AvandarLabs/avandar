/** A non-recursive field value */
export type PrimitiveFieldValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

/**
 * All possible values an entity can hold. This includes primitive values,
 * nested objects, and arrays of field values.
 */
export type FieldValue =
  | PrimitiveFieldValue
  | EntityObject
  | readonly FieldValue[];

/**
 * The base definition of an entity object. This is a record of string
 * keys that map to values. Values can be primitives, nested entities,
 * or arrays of values.
 */
export type EntityObject = {
  [key: string]: FieldValue;
};

/**
 * Render options that can be applied to any FieldValue.
 */
export type PrimitiveFieldValueRenderOptions = {
  emptyString?: string;
  nullOrUndefined?: string;
  booleanTrue?: string;
  booleanFalse?: string;
};

/**
 * A mapping of entity keys to its nested render options.
 * This will take precedence over any global render options.
 */
export type FieldRenderOptionsMap<
  T extends EntityObject,
  Keys extends keyof T = keyof T,
> = {
  [K in Keys]?: T[K] extends EntityObject ? EntityRenderOptions<T[K]>
  : T[K] extends ReadonlyArray<infer ArrayType extends FieldValue> ?
    FieldValueArrayRenderOptions<ArrayType>
  : PrimitiveFieldValueRenderOptions;
};

/**
 * Options for how to render an entity object.
 */
export type EntityRenderOptions<
  T extends EntityObject,
  K extends keyof T = keyof T,
> = PrimitiveFieldValueRenderOptions & {
  excludeKeys?: readonly K[];
  titleKey?: K;

  /**
   * Maps entity fields to its render options. This will take precedence
   * over the global entity render options.
   */
  entityFieldOptions?: FieldRenderOptionsMap<T, K>;
};

export type EntityArrayRenderOptions<
  T extends EntityObject,
  K extends keyof T = keyof T,
> = EntityRenderOptions<T, K> & {
  renderAsTable?: boolean;
};

/**
 * Options for how to render an array of entities.
 */
export type FieldValueArrayRenderOptions<
  T extends FieldValue,
  K extends keyof T = keyof T,
> = {
  emptyArray?: string;
} & (T extends EntityObject ? EntityArrayRenderOptions<T, K>
: PrimitiveFieldValueRenderOptions);

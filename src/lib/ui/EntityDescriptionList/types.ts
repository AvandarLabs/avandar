import { StringPropertyKey } from "@/lib/types/utilityTypes";

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
  nullString?: string;
  undefinedString?: string;
  booleanTrue?: string;
  booleanFalse?: string;
};

/**
 * A mapping of entity keys to its nested render options.
 * This will take precedence over any global render options.
 */
export type FieldRenderOptionsMap<T extends NonNullable<EntityObject>> = {
  [K in StringPropertyKey<T>]?: NonNullable<T[K]> extends EntityObject ?
    EntityRenderOptions<NonNullable<T[K]>>
  : NonNullable<T[K]> extends (
    ReadonlyArray<infer ArrayType extends FieldValue>
  ) ?
    FieldValueArrayRenderOptions<ArrayType>
  : PrimitiveFieldValueRenderOptions;
};

/**
 * Options for how to render an entity object.
 */
export type EntityRenderOptions<T extends NonNullable<EntityObject>> =
  PrimitiveFieldValueRenderOptions & {
    excludeKeys?: ReadonlyArray<StringPropertyKey<T>>;
    titleKey?: StringPropertyKey<T>;

    /**
     * Maps entity fields to its render options. This will take precedence
     * over the global entity render options.
     */
    entityFieldOptions?: FieldRenderOptionsMap<T>;
  };

export type EntityArrayRenderOptions<T extends NonNullable<EntityObject>> =
  EntityRenderOptions<T> & {
    renderAsTable?: boolean;
  };

/**
 * Options for how to render an array of entities.
 */
export type FieldValueArrayRenderOptions<T extends FieldValue> = {
  emptyArray?: string;
} & (T extends EntityObject ? EntityArrayRenderOptions<T>
: PrimitiveFieldValueRenderOptions);

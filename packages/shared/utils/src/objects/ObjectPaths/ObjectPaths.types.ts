/**
 * Depth ladder for bounded recursion. `PreviousDepth[3]` is `2`, and
 * `PreviousDepth[0]` is `never`, which is what terminates `ObjectPaths`.
 */
type PreviousDepth = [never, 0, 1, 2, 3, 4, 5];

/** True when `T` is a union of two or more members. */
type IsUnion<T, Union = T> = [T] extends [never]
  ? false
  : T extends unknown
    ? [Union] extends [T]
      ? false
      : true
    : never;

/** The keys of `T` whose values are functions. */
type FunctionKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: never[]) => unknown
    ? K
    : never;
}[keyof T];

/**
 * True when `T` carries behavior rather than being plain data, judged by
 * holding two or more methods.
 *
 * This is the structural stand-in for "not a record you path into". A DOM
 * element, `Date`, `Map`, or `Promise` is dense with methods; a data record
 * that happens to hold one callback is not. The threshold is two rather than
 * one precisely so `AppLink` (`{ to, params, label: () => string }`) stays
 * pathable and `prop("link.to")` keeps working.
 *
 * Arrays are checked before this, so their `map` / `filter` never reach it.
 */
type IsBehaviorCarrying<T> = IsUnion<FunctionKeys<T>>;

/**
 * True when a dotted path may descend into `V`.
 *
 * Arrays are descended through a `${number}` index segment, plain records
 * through their keys. Functions, primitives, and behavior-carrying objects
 * are leaves.
 */
type IsPathable<V> = V extends (...args: never[]) => unknown
  ? false
  : V extends readonly unknown[]
    ? true
    : V extends object
      ? IsBehaviorCarrying<V> extends true
        ? false
        : true
      : false;

/**
 * Every dot-notation path into `T`, including `${number}` segments for array
 * elements, stopping at values that are not plain data and at `Depth` levels.
 *
 * This exists instead of `type-fest`'s `Paths` because `Paths` recurses into
 * every property type it is given, and the DOM types are cyclic: every node
 * reaches every other node through `parentNode` and `ownerDocument`. Handing
 * `Paths` a `RefObject<HTMLDivElement>` therefore does not fail, it hangs
 * `tsc` at 100% CPU while it instantiates hundreds of thousands of types.
 * `type-fest`'s own `maxRecursionDepth` does not rescue that case, because
 * even one level into `HTMLDivElement` is ~300 properties that expand the
 * same way.
 *
 * Terminating at behavior-carrying values keeps every useful path intact,
 * because the paths worth writing run through plain records and arrays.
 *
 * @example
 * ObjectPaths<{ dataset: { id: string } }>
 * //=> "dataset" | "dataset.id"
 *
 * ObjectPaths<{ layers: Array<{ name: string }> }>
 * //=> "layers" | `layers.${number}` | `layers.${number}.name`
 *
 * ObjectPaths<{ current: HTMLDivElement | null }>
 * //=> "current"
 */
export type ObjectPaths<T, Depth extends number = 5> = [Depth] extends [never]
  ? never
  : T extends readonly unknown[]
    ?
        | `${number}`
        | (IsPathable<NonNullable<T[number]>> extends true
            ? `${number}.${ObjectPaths<NonNullable<T[number]>, PreviousDepth[Depth]> & string}`
            : never)
    : T extends object
      ? {
          [K in Extract<keyof T, string>]:
            | K
            | (IsPathable<NonNullable<T[K]>> extends true
                ? `${K}.${ObjectPaths<NonNullable<T[K]>, PreviousDepth[Depth]> & string}`
                : never);
        }[Extract<keyof T, string>]
      : never;

/** The type of the value that path `P` addresses in `T`. */
export type ObjectPathValue<T, P> = P extends `${infer Key}.${infer Rest}`
  ? T extends readonly unknown[]
    ? Key extends `${number}`
      ? ObjectPathValue<NonNullable<T[number]>, Rest>
      : never
    : Key extends keyof T
      ? ObjectPathValue<NonNullable<T[Key]>, Rest>
      : never
  : T extends readonly unknown[]
    ? P extends `${number}`
      ? T[number]
      : never
    : P extends keyof T
      ? T[P]
      : never;

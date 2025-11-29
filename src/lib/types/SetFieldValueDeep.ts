import { UnknownObject } from "$/lib/types/common";
import { Paths, Simplify, UnknownArray } from "type-fest";

/**
 * Set the type of a property given a shallow key.
 *
 * @param T The type of the object.
 * @param K The shallow key of the property to set.
 * @param V The type to set the property to.
 */
type SetFieldValueShallow<
  T extends UnknownObject | UnknownArray,
  K extends keyof T,
  V,
> = Simplify<
  {
    // remove optionality of the key we're setting
    [Key in K]-?: V;
  } & {
    [Key in Exclude<keyof T, K>]: T[Key];
  }
>;

/**
 * Set the type of a property given a path.
 *
 * @param T The type of the object.
 * @param K The path of the property to set. This can be a dot-notation
 * path or a direct key of the object.
 * @param V The type to set the property to.
 */
export type SetFieldValueDeep<
  T extends UnknownObject | UnknownArray,
  // We need to use this ternary expression on `K` because Paths<> returns
  // `never` on a record. E.g. Paths<string, string> = never.
  // So if `Paths<>` can't compute a set of paths, we can fall back
  // to using `keyof T` which works fine for records.
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V,
> =
  T extends UnknownArray ?
    K extends number | `${number}` ?
      T extends Array<infer Item> ? Array<Item | V>
      : T extends ReadonlyArray<infer Item> ? ReadonlyArray<Item | V>
      : never
    : K extends `${number}.${infer PathTail}` ?
      // dig in recursively
      T extends Array<infer Item extends UnknownObject | UnknownArray> ?
        PathTail extends Paths<Item> ?
          Array<
            SetFieldValueDeep<
              Item,
              [PathTail] extends [never] ? keyof Item : PathTail,
              V
            >
          >
        : never
      : T extends (
        ReadonlyArray<infer Item extends UnknownObject | UnknownArray>
      ) ?
        PathTail extends Paths<Item> ?
          ReadonlyArray<
            SetFieldValueDeep<
              Item,
              [PathTail] extends [never] ? keyof Item : PathTail,
              V
            >
          >
        : never
      : never
    : never
  : K extends keyof T ?
    // K is a direct key of T, so we replace the value at `K` with `V`
    SetFieldValueShallow<T, K, V>
  : T extends UnknownObject ?
    K extends keyof T ?
      // K is a direct key of T, so we replace the value at `K` with `V`
      SetFieldValueShallow<T, K, V>
    : K extends `${infer PathHead}.${infer PathTail}` ?
      PathHead extends keyof T ?
        {
          [Key in keyof T]: Key extends PathHead ?
            // We need to dig in recursively, but we need to assert our types
            // are still valid for the recursive SetFieldValueDeep call
            T[Key] extends UnknownObject | UnknownArray ?
              PathTail extends Paths<T[Key]> ?
                SetFieldValueDeep<
                  T[Key],
                  [PathTail] extends [never] ? keyof T[Key] : PathTail,
                  V
                >
              : never
            : never
          : T[Key];
        }
      : never
    : never
  : never;

/**
 * Replaces a property type in an object type.
 * Usage:
 *
 * ```
 * type X = { foo: number; bar: string; zed: Date };
 * type Y = Replace<X, "foo", string>;
 * // Y = { foo: string; bar: string; zed: Date }
 * ```
 *
 * Can also handle multiple key replacement
 * ```
 * type Y = Replace<X, "foo" | "zed", string>;
 * // Y = { foo: string; bar: string; zed: string }
 * ```
 */
export type Replace<Obj, Key extends keyof Obj, NewType> = {
  [P in Exclude<keyof Obj, Key>]: Obj[P];
} & {
  [P in Key]: NewType;
};

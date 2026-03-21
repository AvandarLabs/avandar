import { getValue } from "../../getValue/getValue.ts";
import type { PathValue } from "../../getValue/getValue.ts";
import type { Paths } from "type-fest";

/**
 * Returns a getter function that returns the value of a property at a given
 * key path in dot notation.
 *
 * @param path The path of the property to get.
 * @returns A function that returns the value at the given key path.
 */
export function prop<
  T extends object,
  K extends [Paths<T>] extends [never] ? keyof T : Paths<T>,
  V extends K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(path: K): (obj: T) => V {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path);
    }
    return obj[path as keyof T] as V;
  };
}

/*
// TODO(jpsyx): use these improved type annotations
type PropTypeError<X extends string> = {
  error: `Invalid path: ${X}`;
};
export function prop2<X extends string>(
  path: X,
): <
  T extends object,
  K extends X extends ([Paths<T>] extends [never] ? keyof T : Paths<T>) ? X
  : PropTypeError<X>,
  V extends K extends PropTypeError<X> ? PropTypeError<X>
  : K extends keyof T ? T[K]
  : K extends Paths<T> ? PathValue<T, K>
  : never,
>(
  obj: T,
) => V {
  return (obj: T) => {
    if (String(path).includes(".")) {
      return getValue(obj, path);
    }
    return obj[path as keyof T] as V;
  };
}

const zz = prop2("name");
const zzz = zz({ name: "Alice", age: 30 });
const x = prop2("namez")({ name: "Alice", age: 30 }); // 'Alice'

const y = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 20 },
].map(prop2("age")); // ['Alice', 'Bob']

const z = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 20 },
].map(prop2("namez")); // ['Alice', 'Bob']

*/

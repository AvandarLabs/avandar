/**
 * This file contains utility types to test typescript types.
 */

/**
 * A type that can be used in type tests to assert a type is true.
 *
 * Example usage:
 *
 * import { IsEqual } from "type-fest";
 * type Tests = [
 *   Expect<IsEqual<A, B>>,
 * ];
 */
export type Expect<T extends true> = T;

export type IsArray<T> = T extends readonly unknown[] ? true : false;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type Not<T extends false> = true;

/**
 * The type annotations in this file support up to 7 piped functions.
 * These are hardcoded, which means if we need to support longer pipes,
 * just add a new annotation for more functions.
 */
import { AnyFunction } from "../types/utilityTypes";

export function pipe<A, B, C>(
  op1: (input: A) => B,
  op2: (input: B) => C,
): (input: A) => C;
export function pipe<A, B, C, D>(
  op1: (input: A) => B,
  op2: (input: B) => C,
  op3: (input: C) => D,
): (input: A) => D;
export function pipe<A, B, C, D, E>(
  op1: (input: A) => B,
  op2: (input: B) => C,
  op3: (input: C) => D,
  op4: (input: D) => E,
): (input: A) => E;
export function pipe<A, B, C, D, E, F>(
  op1: (input: A) => B,
  op2: (input: B) => C,
  op3: (input: C) => D,
  op4: (input: D) => E,
  op5: (input: E) => F,
): (input: A) => F;
export function pipe<A, B, C, D, E, F, G>(
  op1: (input: A) => B,
  op2: (input: B) => C,
  op3: (input: C) => D,
  op4: (input: D) => E,
  op5: (input: E) => F,
  op6: (input: F) => G,
): (input: A) => G;
export function pipe<A, B, C, D, E, F, G, H>(
  op1: (input: A) => B,
  op2: (input: B) => C,
  op3: (input: C) => D,
  op4: (input: D) => E,
  op5: (input: E) => F,
  op6: (input: F) => G,
  op7: (input: G) => H,
): (input: A) => H;

/**
 * A `pipe` function that returns a single function that will apply
 * a collection of functions in sequential order. The result of one function
 * is passed to the first argument of the next function.
 *
 * This function is very strictly typed in order to detect type errors
 * in any intermediate function applications.
 *
 * @param functions
 * @returns
 */
export function pipe(...functions: AnyFunction[]): (value: unknown) => unknown {
  return (value: unknown) => {
    return functions.reduce((acc, fn) => {
      return fn(acc);
    }, value);
  };
}

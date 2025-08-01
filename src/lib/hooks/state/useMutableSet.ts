import { useSet as mantineUseSet } from "@mantine/hooks";
import { useMemo } from "react";

/**
 * Hook to manage a set of values.
 *
 * NOTE: this uses mantine's `useSet` under the hood which
 * uses a *mutable* set. The set will maintain the same reference
 * after each update. Mantine uses a `forceUpdate` hook to correctly
 * trigger a re-render but beware of any situations where you truly
 * depend on an immutable set that produces a new reference with
 * each mutation.
 *
 * Usage:
 * ```ts
 * const [ids, setIds] = useMutableSet<number>([1, 2, 3]);
 *
 * ids.has(6); // false
 *
 * setIds.add(4);
 * setIds.delete(1);
 * setIds.clear();
 * ```
 * @param values Optional initial values for the set.
 * @returns A tuple of [value, setterFns]
 */
export function useMutableSet<T>(values?: T[]): [
  Set<T>,
  {
    add: (value: T) => Set<T>;
    delete: (value: T) => boolean;
    clear: () => void;
  },
] {
  const set = mantineUseSet<T>(values);
  const setters = useMemo(() => {
    return {
      add: set.add,
      delete: set.delete,
      clear: set.clear,
    };
  }, [set]);

  return [set, setters];
}

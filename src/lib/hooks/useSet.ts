import { useMemo, useState } from "react";

/**
 * Hook to manage a set of values.
 *
 * This has the same signature as `useMutableSet` except the set
 * is guaranteed to be immutable. Therefore, insertions and deletions
 * are O(n) instead of O(1), but you are guaranteed a new reference on
 * each operation.
 *
 * Usage:
 * ```ts
 * const [ids, setIds] = useSet<number>([1, 2, 3]);
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
export function useSet<T>(values?: T[]): [
  Set<T>,
  {
    add: (value: T) => void;
    delete: (value: T) => void;
    clear: () => void;
  },
] {
  const [set, setSet] = useState(() => {
    return new Set(values);
  });
  return [
    set,
    {
      add: (value: T) => {
        const newSet = new Set(set);
        newSet.add(value);
        setSet(newSet);
      },
      delete: (value: T) => {
        const newSet = new Set(set);
        newSet.delete(value);
        setSet(newSet);
      },
      clear: () => {
        setSet(new Set<T>());
      },
    },
  ];
}

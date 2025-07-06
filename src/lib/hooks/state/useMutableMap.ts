import { useMap as mantineUseMap } from "@mantine/hooks";
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
 * const [idsToUser, setIdsToUser] = useMutableMap<UserId, User>();
 *
 * idsToUser.has('uuid-1'); // false
 *
 * setIdsToUser.set('uuid-1', user1);
 * setIdsToUser.delete('uuid-1');
 * setIdsToUser.clear();
 * ```
 * @param values Optional initial values for the set.
 * @returns A tuple of [value, setterFns]
 */
export function useMutableMap<K, V>(
  values?: ReadonlyArray<[K, V]>,
): [
  Map<K, V>,
  {
    set: (key: K, value: V) => Map<K, V>;
    delete: (key: K) => boolean;
    clear: () => void;
  },
] {
  const map = mantineUseMap(values as Array<[K, V]>);

  const setters = useMemo(() => {
    return {
      set: map.set,
      delete: map.delete,
      clear: map.clear,
    };
  }, [map]);

  return [map, setters];
}

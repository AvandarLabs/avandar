import { useMemo, useState } from "react";

/**
 * Hook to manage a map of values.
 *
 * This has the same signature as `useMutableMap` except the map
 * is guaranteed to be immutable. Therefore, insertions and deletions
 * are O(n) instead of O(1), but you are guaranteed a new reference on
 * each operation.
 *
 * Usage:
 * ```ts
 * const [idsToUser, setIdsToUser] = useMap<UserId, User>();
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
export function useMap<K, V>(
  values?: ReadonlyArray<[K, V]>,
): [
  Map<K, V>,
  {
    set: (key: K, value: V) => void;
    delete: (key: K) => void;
    clear: () => void;
  },
] {
  const [map, setMap] = useState(() => {
    return new Map(values);
  });

  const setters = useMemo(() => {
    return {
      set: (key: K, value: V) => {
        setMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(key, value);
          return newMap;
        });
      },
      delete: (key: K) => {
        setMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.delete(key);
          return newMap;
        });
      },
      clear: () => {
        setMap(new Map<K, V>());
      },
    };
  }, []);

  return [map, setters];
}

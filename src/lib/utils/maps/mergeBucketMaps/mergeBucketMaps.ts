/**
 * Merges multiple bucket maps into a single bucket map. When keys collide,
 * the values from the input maps are appended to the bucket's array.
 *
 * @param inputMaps The bucket maps to merge.
 * @returns A merged bucket map.
 */
export function mergeBucketMaps<K, V>(
  ...inputMaps: ReadonlyArray<Map<K, V[]>>
): Map<K, V[]> {
  const mergedMap = new Map<K, V[]>();
  inputMaps.forEach((map) => {
    map.forEach((items, key) => {
      const existingItems = mergedMap.get(key);
      if (existingItems) {
        mergedMap.set(key, [...existingItems, ...items]);
      } else {
        mergedMap.set(key, [...items]);
      }
    });
  });
  return mergedMap;
}

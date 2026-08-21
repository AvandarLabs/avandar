/** Columns to render for a page of cluster leaves. */
export type ClusterTableColumns =
  | { source: "properties"; keys: readonly string[] }
  | { source: "id"; keys: readonly ["id"] };

/**
 * Derives the cluster table's columns from the leaves themselves, so the
 * table always agrees with whatever fields the layer's popup configuration
 * put on each feature.
 *
 * Falls back to a single `id` column, read from `Feature.id` rather than
 * `Feature.properties`, when no leaf carries any properties at all (the
 * layer's popup shows no fields).
 */
export function getClusterTableColumnsFromLeaves(
  leaves: readonly GeoJSON.Feature[],
): ClusterTableColumns {
  const keys = new Set<string>();
  leaves.forEach((leaf) => {
    Object.keys(leaf.properties ?? {}).forEach((key) => {
      keys.add(key);
    });
  });
  if (keys.size > 0) {
    return { source: "properties", keys: [...keys] };
  }
  return { source: "id", keys: ["id"] };
}

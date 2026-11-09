import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Builds the config a public map page is drawn from. Each layer keeps its
 * styling, binding, legend, and query columns (the renderer resolves paint
 * and popup columns through them) but loses its data source, filters, and
 * joins, which name datasets and filter values the page has no reason to see.
 */
export function createPublicMapConfigFromMapConfig(
  config: Readonly<AvaMapConfig.T>,
): AvaMapConfig.T {
  return {
    ...config,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        source: {
          ...StructuredQuery.makeEmpty(),
          queryColumns: layer.source.queryColumns,
        },
      };
    }),
  };
}

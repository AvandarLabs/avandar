import type { SocrataViewMetadata } from "$/connectors/open-data/SocrataClient/SocrataClient.types.ts";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

const ROWS_UPDATED_PREFIX = "socrata:rowsUpdatedAt:";
const VIEW_MODIFIED_PREFIX = "socrata:viewLastModified:";

/**
 * Builds an opaque change token for one Socrata view, or undefined when
 * neither freshness field is present.
 *
 * Prefers `rowsUpdatedAt`, which Socrata's own platform stamps when a row
 * changes - stronger evidence than `viewLastModified`, which also moves on a
 * metadata-only edit (a description typo fix), mirroring exactly why the
 * CKAN version builder prefers `hash` over `metadata_modified`.
 */
export function makeSourceVersionFromSocrataViewMetadata(
  metadata: Readonly<SocrataViewMetadata>,
): SourceVersion | undefined {
  if (metadata.rowsUpdatedAt !== undefined) {
    return `${ROWS_UPDATED_PREFIX}${metadata.rowsUpdatedAt}`;
  }
  if (metadata.viewLastModified !== undefined) {
    return `${VIEW_MODIFIED_PREFIX}${metadata.viewLastModified}`;
  }
  return undefined;
}

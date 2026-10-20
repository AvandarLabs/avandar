import type { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import type {
  CkanPackage,
  CkanResource,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { z } from "zod";

type _WirePackage = z.output<typeof CkanPackageSchema>;

function _toResource(wire: _WirePackage["resources"][number]): CkanResource {
  return {
    id: wire.id,
    name: wire.name,
    format: wire.format,
    url: wire.url,
    url_type: wire.url_type ?? "upload",
    size: wire.size ?? undefined,
    hash: wire.hash ?? "",
    last_modified: wire.last_modified ?? undefined,
    mimetype: wire.mimetype ?? undefined,
    datastore_active: wire.datastore_active ?? false,
  };
}

/**
 * Normalizes one wire dataset into the shape the rest of this code reads,
 * turning CKAN's absent-or-null fields into `undefined` and defaulting the
 * two that an older deployment can omit. Shared by `package_show` and
 * `package_search`, which return the same dataset shape.
 */
export function createCkanPackageFromWire(wire: _WirePackage): CkanPackage {
  return {
    id: wire.id,
    name: wire.name,
    metadata_modified: wire.metadata_modified ?? undefined,
    resources: wire.resources.map(_toResource),
  };
}

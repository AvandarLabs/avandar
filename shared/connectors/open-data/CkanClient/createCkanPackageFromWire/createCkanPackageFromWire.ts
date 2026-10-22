import { readHdxFileHeaders } from "$/connectors/open-data/CkanClient/readHdxFileHeaders/readHdxFileHeaders.ts";
import type { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import type {
  CkanPackage,
  CkanResource,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { z } from "zod";

type _WirePackage = z.output<typeof CkanPackageSchema>;

/**
 * Normalizes one wire resource, turning CKAN's absent-or-null fields into
 * `undefined` and defaulting the three that an older deployment can omit:
 * `url_type`, `hash`, and `datastore_active`. HDX's file structure check log
 * becomes `fileHeaders`.
 */
function _toResource(wire: _WirePackage["resources"][number]): CkanResource {
  const fileHeaders = readHdxFileHeaders(wire.fs_check_info);
  return {
    ...(fileHeaders === undefined ? {} : { fileHeaders }),
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
 * Normalizes one wire dataset and its resources into the shape the rest of
 * this code reads. Shared by `package_show` and `package_search`, which
 * return the same dataset shape.
 */
export function createCkanPackageFromWire(wire: _WirePackage): CkanPackage {
  return {
    id: wire.id,
    name: wire.name,
    metadata_modified: wire.metadata_modified ?? undefined,
    resources: wire.resources.map(_toResource),
  };
}

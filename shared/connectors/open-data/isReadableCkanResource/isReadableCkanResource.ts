import {
  HOSTED_FILE_URL_TYPE,
  READABLE_FORMATS,
} from "$/connectors/open-data/getCkanResourceFromPackage.ts";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/**
 * Whether a CKAN resource is worth reading at all - the same two rules
 * `getCkanResourceFromPackage` enforces one at a time with a distinct
 * failure code each, collapsed into a single yes/no answer for a caller
 * (the open-data-catalog-listings pipeline) that only needs to decide
 * whether to register the resource, not explain why it was skipped.
 *
 * Checks only the resource's intrinsic upload-type and format - not whether
 * its URL's host matches the catalogued `baseUrl`, and not any size ceiling,
 * both of which `getCkanResourceFromPackage` still separately enforces.
 */
export function isReadableCkanResource(
  resource: Readonly<CkanResource>,
): boolean {
  return (
    resource.url_type === HOSTED_FILE_URL_TYPE &&
    READABLE_FORMATS.includes(resource.format.toLowerCase())
  );
}

import {
  buildCkanActionUrl,
  unwrapCkanActionEnvelope,
} from "$/connectors/open-data/ckanActionApiHelpers.ts";
import { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type {
  CkanClient,
  CkanPackage,
  CkanResource,
  OpenDataHttp,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { z } from "zod";

/**
 * Normalizes one wire resource into the shape the rest of this code reads,
 * turning CKAN's absent-or-null fields into undefined and defaulting the two
 * booleans that an older deployment can omit.
 */
function _toResource(
  wire: z.output<typeof CkanPackageSchema>["resources"][number],
): CkanResource {
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
 * Reads CKAN metadata and resource bytes over an injected HTTP layer.
 *
 * Stateless, and every call takes its base URL as an argument, so one client
 * serves several CKAN deployments and nothing here reads a module global.
 * Nothing in this module knows about caching, authorization, or Avandar's
 * catalog: it translates to and from CKAN's interface and stops there.
 */
export function createCkanClient(http: Readonly<OpenDataHttp>): CkanClient {
  return {
    getPackage: async ({ baseUrl, ckanDatasetId }): Promise<CkanPackage> => {
      const url = buildCkanActionUrl({
        baseUrl,
        action: "package_show",
        query: { id: ckanDatasetId },
      });
      const result = unwrapCkanActionEnvelope(
        "package_show",
        await http.getJson(url),
      );
      const wire = CkanPackageSchema.parse(result);
      return {
        id: wire.id,
        name: wire.name,
        metadata_modified: wire.metadata_modified ?? undefined,
        resources: wire.resources.map(_toResource),
      };
    },

    getResourceBytes: async ({ ckanResourceId, url }) => {
      try {
        return await http.getBytes(url);
      } catch (cause) {
        // The URL is deliberately absent from the failure: CKAN redirects a
        // download to a presigned object-store URL, which is a credential.
        throw new OpenDataAcquisitionFailed(
          { code: "resource-unreachable", ckanResourceId },
          cause,
        );
      }
    },
  };
}

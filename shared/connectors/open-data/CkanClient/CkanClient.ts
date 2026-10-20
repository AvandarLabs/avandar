import {
  buildCkanActionUrl,
  unwrapCkanActionEnvelope,
} from "$/connectors/open-data/ckanActionApiHelpers.ts";
import { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { createCkanPackageFromWire } from "$/connectors/open-data/CkanClient/createCkanPackageFromWire/createCkanPackageFromWire.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type {
  CkanClient,
  CkanPackage,
  OpenDataHttp,
} from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

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
        await http.get(url),
      );
      return createCkanPackageFromWire(CkanPackageSchema.parse(result));
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

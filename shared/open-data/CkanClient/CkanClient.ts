import {
  CkanEnvelopeSchema,
  CkanPackageSchema,
} from "$/open-data/CkanClient/CkanClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/open-data/openDataErrors.ts";
import type {
  CkanClient,
  CkanPackage,
  CkanResource,
  OpenDataHttp,
} from "$/open-data/CkanClient/CkanClient.types.ts";
import type { z } from "zod";

/** CKAN's action API path, the same on every deployment. */
const ACTION_PATH = "/api/3/action";

/**
 * The `error.__type` CKAN uses when an action needs a logged-in user. HDX
 * returns it for every datastore action to an anonymous caller, so it is worth
 * telling apart from an ordinary action failure: one means "not for you", the
 * other means "your request was wrong".
 */
const AUTHORIZATION_ERROR_TYPE = "Authorization Error";

function _buildActionUrl(params: {
  baseUrl: string;
  action: string;
  query: Readonly<Record<string, string>>;
}): string {
  const root = params.baseUrl.replace(/\/+$/, "");
  const search = new URLSearchParams(params.query).toString();
  return `${root}${ACTION_PATH}/${params.action}?${search}`;
}

/**
 * Unwraps CKAN's envelope, raising rather than returning undefined when the
 * action failed. A failed action still arrives with HTTP 200, so this check is
 * the only thing standing between a caller and a silently absent result.
 */
function _getActionResult(action: string, body: unknown): unknown {
  const envelope = CkanEnvelopeSchema.parse(body);
  if (envelope.success) {
    return envelope.result;
  }
  const ckanErrorType = envelope.error.__type ?? "unknown";
  if (ckanErrorType === AUTHORIZATION_ERROR_TYPE) {
    throw new OpenDataAcquisitionFailed({
      code: "ckan-authorization-required",
      action,
    });
  }
  throw new OpenDataAcquisitionFailed({
    code: "ckan-action-failed",
    action,
    ckanErrorType,
  });
}

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
      const url = _buildActionUrl({
        baseUrl,
        action: "package_show",
        query: { id: ckanDatasetId },
      });
      const result = _getActionResult("package_show", await http.getJson(url));
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

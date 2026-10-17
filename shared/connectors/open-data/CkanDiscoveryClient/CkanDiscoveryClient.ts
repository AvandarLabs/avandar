import { CkanEnvelopeSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { CkanPackageListResultSchema } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

/** CKAN's action API path, the same on every deployment. */
const ACTION_PATH = "/api/3/action";

/** CKAN's `__type` for an action requiring a logged-in user. */
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
 *
 * This is a second copy of `CkanClient.ts`'s private `_getActionResult`,
 * rather than a shared import: that function is not exported, since
 * `CkanClient` and `CkanDiscoveryClient` are deliberately separate modules
 * reading different CKAN actions.
 */
function _unwrapEnvelope(action: string, body: unknown): unknown {
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
 * Lists CKAN dataset slugs over an injected HTTP layer.
 *
 * Stateless, mirroring `CkanClient`'s shape: every call takes its base URL
 * as an argument, so one client serves any number of CKAN deployments.
 * Separate from `CkanClient` because it discovers *which* datasets exist
 * rather than reading one already-known dataset - the same split
 * `SocrataDiscoveryClient` already draws against `SocrataClient`.
 */
export function createCkanDiscoveryClient(
  http: Readonly<OpenDataHttp>,
): CkanDiscoveryClient {
  return {
    listDatasets: async ({ baseUrl }): Promise<string[]> => {
      const url = _buildActionUrl({
        baseUrl,
        action: "package_list",
        query: {},
      });
      const result = _unwrapEnvelope("package_list", await http.getJson(url));
      return CkanPackageListResultSchema.parse(result);
    },
  };
}

import { CkanEnvelopeSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";

/** CKAN's action API path, the same on every deployment. */
export const CKAN_ACTION_PATH = "/api/3/action";

/**
 * The `error.__type` CKAN uses when an action needs a logged-in user. HDX
 * returns it for every datastore action to an anonymous caller, so it is
 * worth telling apart from an ordinary action failure: one means "not for
 * you", the other means "your request was wrong".
 */
export const CKAN_AUTHORIZATION_ERROR_TYPE = "Authorization Error";

/**
 * Builds a CKAN action API URL from a deployment's base URL, the action
 * name, and its query parameters.
 */
export function buildCkanActionUrl(params: {
  baseUrl: string;
  action: string;
  query: Readonly<Record<string, string>>;
}): string {
  const root = params.baseUrl.replace(/\/+$/, "");
  const search = new URLSearchParams(params.query).toString();
  return `${root}${CKAN_ACTION_PATH}/${params.action}?${search}`;
}

/**
 * Unwraps CKAN's envelope, raising rather than returning undefined when the
 * action failed. A failed action still arrives with HTTP 200, so this check
 * is the only thing standing between a caller and a silently absent result.
 */
export function unwrapCkanActionEnvelope(
  action: string,
  body: unknown,
): unknown {
  const envelope = CkanEnvelopeSchema.parse(body);
  if (envelope.success) {
    return envelope.result;
  }
  const ckanErrorType = envelope.error.__type ?? "unknown";
  if (ckanErrorType === CKAN_AUTHORIZATION_ERROR_TYPE) {
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

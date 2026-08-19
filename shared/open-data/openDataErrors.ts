/**
 * Why an open data acquisition could not produce bytes. Callers branch on
 * `code` rather than on message prose, and each member carries only the
 * context its own condition has: a format mismatch knows both formats, a size
 * refusal knows both sizes, and neither knows anything about the other.
 *
 * No member carries a URL. A CKAN resource download answers with a redirect to
 * a presigned object-store URL, which is a credential, so neither an error nor
 * a log line may repeat it.
 */
export type OpenDataAcquisitionFailure =
  /**
   * CKAN answered 200 with `success: false`, which is how it reports a failure
   * in-band.
   */
  | { code: "ckan-action-failed"; action: string; ckanErrorType: string }
  /**
   * The action requires an authenticated CKAN user and no credential is held.
   */
  | { code: "ckan-authorization-required"; action: string }
  /** The dataset no longer lists the resource the catalog entry names. */
  | { code: "resource-not-found"; ckanResourceId: string }
  /**
   * The resource points at an upstream API rather than a file CKAN hosts. Those
   * have no shared contract, no size guarantee, and are sometimes plain HTTP.
   */
  | { code: "resource-is-remote-api"; ckanResourceId: string; urlType: string }
  /** The resource is a format this code cannot read, such as an archive. */
  | { code: "resource-format-unsupported"; ckanResourceId: string; format: string }
  /**
   * The live format differs from the one recorded when the entry was written.
   */
  | {
      code: "resource-format-changed";
      ckanResourceId: string;
      format: string;
      expectedFormat: string;
    }
  /**
   * The resource is larger than the caller allows. Raised before any download.
   */
  | {
      code: "resource-too-large";
      ckanResourceId: string;
      sizeInBytes: number;
      maxBytes: number;
    }
  /**
   * The resource's download URL is on a different host from the catalogued API.
   * Refused because the URL comes from CKAN's response rather than from
   * Avandar's catalog: honouring it would let whatever a CKAN instance returns
   * choose which host gets fetched, which matters most when the fetch runs
   * server-side and can reach hosts a browser could not.
   */
  | {
      code: "resource-host-mismatch";
      ckanResourceId: string;
      resourceHost: string;
      expectedHost: string;
    }
  /**
   * The byte read failed. In a browser this is also how a blocked cross-origin
   * request appears, because `fetch` reports one as an opaque `TypeError` with
   * no status, so this condition cannot tell "blocked" from "host down".
   */
  | { code: "resource-unreachable"; ckanResourceId: string }
  /** The catalog entry satisfied neither access shape, so it cannot be read. */
  | { code: "access-shape-invalid"; accessKind: string };

/** Machine-readable reason an open data acquisition was refused. */
export type OpenDataAcquisitionFailureCode = OpenDataAcquisitionFailure["code"];

function _buildFailureMessage(failure: OpenDataAcquisitionFailure): string {
  switch (failure.code) {
    case "ckan-action-failed":
      return `CKAN action '${failure.action}' failed with '${failure.ckanErrorType}'.`;
    case "ckan-authorization-required":
      return `CKAN action '${failure.action}' requires an authenticated user.`;
    case "resource-not-found":
      return `CKAN resource '${failure.ckanResourceId}' is not listed in its dataset.`;
    case "resource-is-remote-api":
      return `CKAN resource '${failure.ckanResourceId}' is a '${failure.urlType}' resource, which serves an upstream API rather than a file.`;
    case "resource-format-unsupported":
      return `CKAN resource '${failure.ckanResourceId}' is a '${failure.format}' resource, which cannot be read as a table.`;
    case "resource-format-changed":
      return `CKAN resource '${failure.ckanResourceId}' is now '${failure.format}' but the catalog recorded '${failure.expectedFormat}'.`;
    case "resource-too-large":
      return `CKAN resource '${failure.ckanResourceId}' is ${failure.sizeInBytes} bytes, above the ${failure.maxBytes} byte limit.`;
    case "resource-host-mismatch":
      return `CKAN resource '${failure.ckanResourceId}' is served from '${failure.resourceHost}' but its catalog entry names '${failure.expectedHost}'.`;
    case "resource-unreachable":
      return `CKAN resource '${failure.ckanResourceId}' could not be read.`;
    case "access-shape-invalid":
      return `Catalog entry declares access kind '${failure.accessKind}' but does not carry that shape's columns.`;
  }
}

/**
 * Thrown when an open data catalog entry cannot be turned into bytes.
 *
 * One type with a `code` union rather than a class per condition, because the
 * only thing a caller does differently per condition is read the code: they all
 * abort the same acquisition. `AvaHTTPError` is deliberately not reused; it
 * models a status to send back to a client and pulls in the Supabase and Resend
 * clients, neither of which belongs in an acquisition path.
 */
export class OpenDataAcquisitionFailed extends Error {
  /** Which condition failed, and the context that condition carries. */
  readonly failure: OpenDataAcquisitionFailure;

  /**
   * Creates a failure. `cause` carries the underlying fault, when there is
   * one.
   */
  constructor(failure: OpenDataAcquisitionFailure, cause?: unknown) {
    super(_buildFailureMessage(failure), { cause });
    this.name = "OpenDataAcquisitionFailed";
    this.failure = failure;
  }

  /** Whether `value` is a failure of this kind, optionally of one code. */
  static is(
    value: unknown,
    code?: OpenDataAcquisitionFailureCode,
  ): value is OpenDataAcquisitionFailed {
    return (
      value instanceof OpenDataAcquisitionFailed &&
      (code === undefined || value.failure.code === code)
    );
  }
}

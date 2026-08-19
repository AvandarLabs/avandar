import { OpenDataAcquisitionFailed } from "$/open-data/openDataErrors.ts";
import type {
  CkanPackage,
  CkanResource,
} from "$/open-data/CkanClient/CkanClient.types.ts";

/**
 * The resource formats that can be read as a table. Compared case
 * insensitively, because CKAN deployments report `CSV`, `csv` and `Csv` for the
 * same thing.
 *
 * `XLSX` and `JSON` are absent deliberately rather than by omission: both need
 * a parsing decision this code does not make yet, and refusing them by name is
 * more useful than downloading bytes nothing can read.
 */
const READABLE_FORMATS: readonly string[] = ["csv", "parquet"];

/**
 * The `url_type` CKAN gives a file it hosts itself. Anything else, in practice
 * `api`, points at an upstream endpoint with no shared contract, no size
 * guarantee, and sometimes no TLS.
 */
const HOSTED_FILE_URL_TYPE = "upload";

/**
 * Reads a URL's lowercased host, or the empty string when it does not parse.
 *
 * An unparseable URL yields the empty string rather than throwing, so a
 * malformed resource URL is refused by the host comparison it then fails
 * instead of escaping as a different kind of error. Only `https` URLs can
 * produce a host here: an `http` URL is given a host of the empty string too,
 * so it can never match a catalogued `https` origin.
 */
function _getHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.host.toLowerCase() : "";
  } catch {
    return "";
  }
}

/**
 * Finds the one resource a catalog entry names, and refuses it when it cannot
 * be read.
 *
 * The resource is always found by id and never by position. A CKAN dataset
 * routinely lists a readme, a codebook or a licence ahead of its data, so
 * "the first resource" is not a safe default: it is a wrong answer that looks
 * like a right one.
 *
 * Refusals are ordered by how permanent they are. Being an upstream API, being
 * served from an unexpected host, and being an unreadable format are properties
 * of the resource itself; a size refusal depends on the caller's ceiling, so it
 * comes last and is still decided from metadata, before any bytes are read.
 *
 * @param params.baseUrl The catalogued API root. The resource's own download
 *   URL must be on this host: the URL arrives in CKAN's response rather than
 *   from Avandar's catalog, so without this check whatever a CKAN instance
 *   returns would decide which host gets fetched.
 * @param params.expectedFormat The format the catalog recorded for this
 *   resource. A live format that no longer matches it is an error rather than a
 *   reason to parse the bytes as something else.
 * @param params.maxBytes The largest resource this caller will read. Inclusive.
 */
export function getCkanResourceFromPackage(params: {
  ckanPackage: Readonly<CkanPackage>;
  ckanResourceId: string;
  baseUrl: string;
  expectedFormat: string;
  maxBytes: number;
}): CkanResource {
  const { ckanResourceId, expectedFormat, maxBytes } = params;

  const resource = params.ckanPackage.resources.find((candidate) => {
    return candidate.id === ckanResourceId;
  });
  if (!resource) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-not-found",
      ckanResourceId,
    });
  }

  if (resource.url_type !== HOSTED_FILE_URL_TYPE) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-is-remote-api",
      ckanResourceId,
      urlType: resource.url_type,
    });
  }

  const expectedHost = _getHost(params.baseUrl);
  const resourceHost = _getHost(resource.url);
  if (resourceHost !== expectedHost) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-host-mismatch",
      ckanResourceId,
      resourceHost,
      expectedHost,
    });
  }

  const format = resource.format.toLowerCase();
  if (!READABLE_FORMATS.includes(format)) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-format-unsupported",
      ckanResourceId,
      format: resource.format,
    });
  }

  if (format !== expectedFormat.toLowerCase()) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-format-changed",
      ckanResourceId,
      format: resource.format,
      expectedFormat,
    });
  }

  // An absent size is not a refusal: an older upload can report none, and the
  // caller's ceiling still applies to the read itself.
  if (resource.size !== undefined && resource.size > maxBytes) {
    throw new OpenDataAcquisitionFailed({
      code: "resource-too-large",
      ckanResourceId,
      sizeInBytes: resource.size,
      maxBytes,
    });
  }

  return resource;
}

/**
 * The HTTP layer a CKAN read needs, injected so nothing here reaches the
 * network on its own and every test runs offline.
 *
 * The two members are separate rather than one `fetch`-shaped dependency
 * because they do not have the same reachability. CKAN's `/api/3/action/*`
 * responses carry `access-control-allow-origin: *`, so metadata can be read
 * straight from a browser. A resource download answers with a redirect whose
 * `access-control-allow-origin` names only the CKAN host, so those bytes cannot
 * be read from another origin in a browser at all and have to come through a
 * server-side reader. Collapsing the two would hide that.
 */
export type OpenDataHttp = {
  /** Reads a JSON document. Parsed but not validated; the caller validates. */
  getJson: (url: string) => Promise<unknown>;

  /** Reads raw bytes. Must follow redirects and must not cache the target. */
  getBytes: (url: string) => Promise<Uint8Array<ArrayBuffer>>;
};

/**
 * One file or endpoint inside a CKAN dataset. Field names are CKAN's own
 * snake_case: this describes someone else's wire format rather than an Avandar
 * model, so renaming would invite drift when CKAN adds a field.
 */
export type CkanResource = {
  id: string;
  name: string;
  /** e.g. `CSV`, `XLSX`, `zip`. Case varies between deployments. */
  format: string;
  url: string;
  /** `upload` for a file CKAN hosts, `api` for an upstream endpoint. */
  url_type: string;
  size: number | undefined;
  /** An MD5 of the content when CKAN has one, and an empty string when not. */
  hash: string;
  last_modified: string | undefined;
  /** Present on ~60% of real resources, so never branched on. */
  mimetype: string | undefined;
  /** Whether CKAN has this resource's rows loaded into its datastore. */
  datastore_active: boolean;
};

/**
 * One column of a CKAN datastore result. `datastore_search` returns these
 * alongside its records, and they are the only trustworthy source of column
 * order: a record is a JSON object, whose key order is not a contract and whose
 * optional keys may be absent entirely.
 */
export type CkanDatastoreField = {
  id: string;
  /** CKAN's own type name, e.g. `text`, `numeric`. Carried, not interpreted. */
  type: string | undefined;
};

/** One CKAN dataset and the resources it lists. */
export type CkanPackage = {
  id: string;
  name: string;
  /**
   * When the dataset's metadata last changed, which includes adding, removing
   * or re-pointing a resource. Distinct from a resource's `last_modified`,
   * which tracks its data.
   */
  metadata_modified: string | undefined;
  resources: readonly CkanResource[];
};

/** Reads CKAN metadata and resource bytes. Stateless. */
export type CkanClient = {
  /** Reads one dataset and every resource it lists. */
  getPackage: (params: {
    baseUrl: string;
    ckanDatasetId: string;
  }) => Promise<CkanPackage>;

  /** Reads one resource's bytes from the URL the resource itself names. */
  getResourceBytes: (params: {
    ckanResourceId: string;
    url: string;
  }) => Promise<Uint8Array<ArrayBuffer>>;
};

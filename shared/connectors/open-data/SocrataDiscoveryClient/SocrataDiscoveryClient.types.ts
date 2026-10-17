/** One dataset returned by a Socrata Discovery API search. */
export type SocrataDiscoveryResult = {
  /** The dataset's 4x4 id, e.g. "erm2-nwe9". */
  datasetId: string;
  name: string;
  /** The portal domain this result lives on, e.g. "data.cityofnewyork.us". */
  domain: string;
};

/** Searches Socrata's cross-portal Discovery API for candidate datasets. */
export type SocrataDiscoveryClient = {
  /**
   * Searches Socrata's cross-portal Discovery API. `domains`, when given,
   * narrows to one portal (layer-0 "drive" search within it); omitted, it
   * searches every opted-in portal at once (drive discovery - "is there a
   * Chicago portal").
   */
  search: (params: {
    /** Free-text search. Omitted lists the domain's full catalog. */
    query?: string;
    domains?: readonly string[];
    limit?: number;
    /** Pages past the first `limit` results, for enumerating a large domain. */
    offset?: number;
  }) => Promise<SocrataDiscoveryResult[]>;
};

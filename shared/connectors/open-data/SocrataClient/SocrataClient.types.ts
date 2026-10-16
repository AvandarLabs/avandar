/**
 * One Socrata "view" (dataset)'s metadata, from `/api/views/{id}.json`. Field
 * names are Socrata's own: this describes someone else's wire format rather
 * than an Avandar model.
 */
export type SocrataViewMetadata = {
  id: string;
  name: string;
  /** Unix seconds. When the view's rows last changed, Socrata's own clock. */
  rowsUpdatedAt: number | undefined;
  /** Unix seconds. When the view's metadata last changed. */
  viewLastModified: number | undefined;
};

/** Reads Socrata view metadata and resource rows. Stateless. */
export type SocrataClient = {
  /** Reads one view's metadata - the freshness token source. */
  getMetadata: (params: {
    baseUrl: string;
    socrataDatasetId: string;
  }) => Promise<SocrataViewMetadata>;

  /**
   * Reads one view's rows as CSV text, capped at `maxRows`. SODA serves CSV
   * natively from the same resource endpoint JSON comes from
   * (`/resource/{id}.csv`), so no JSON-to-CSV conversion is needed here,
   * unlike CKAN's datastore records case.
   */
  getRows: (params: {
    baseUrl: string;
    socrataDatasetId: string;
    maxRows: number;
  }) => Promise<string>;

  /** Reads one view's row count, checked against `maxRows` before fetching. */
  getRowCount: (params: {
    baseUrl: string;
    socrataDatasetId: string;
  }) => Promise<number>;
};

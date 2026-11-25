/** Application display name. */
export const APP_NAME = "Avandar";

/** The email address to use for support inquiries */
export const SUPPORT_EMAIL = "support@avandarlabs.com";

/** The email address to use for general inquiries */
export const INFO_EMAIL = "info@avandarlabs.com";

/** The maximum number of seats allowed for the free plan. */
export const MAX_FREE_PLAN_SEATS = 2;

/**
 * Configuration that is meaningful in every runtime: the web app, the desktop
 * app, and the Supabase edge functions. Prefer importing from here when a
 * setting must stay in sync everywhere.
 *
 * Settings that only make sense inside the browser bundle belong in
 * `WebAppConfig` (`src/config/WebAppConfig.ts`) instead.
 */
export const GlobalAppConfig = {
  /** Limits for dataset ingest and preview in the data manager app. */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: 100,

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: 500,

    /** Maximum number of rows to preview */
    maxPreviewRows: 200,
  },

  /** Timing values that several runtimes must agree on. */
  timing: {
    /**
     * How long a Google Sheet's Drive `File.version` may be reused before it is
     * read again.
     *
     * A read-throttle on the version check, not a staleness allowance. Without
     * it a dashboard with six Sheets-backed charts issues six metadata calls
     * per render pass. The cost is that an edit made inside the window is not
     * noticed until it closes, and the explicit "Refresh from Google Sheets"
     * action is the escape hatch that makes that acceptable.
     */
    googleSheetFreshnessDebounceMs: 60_000,

    /**
     * How long rows acquired from a live source (a Google Sheet or a
     * Postgres table) may be served from a browser cache before they are
     * acquired again. An edit made at the source shows up within this window,
     * and the source's "Refresh" action is the escape hatch for not waiting.
     */
    liveRelationMaxAgeMs: 5 * 60_000,

    /**
     * How long a current Parquet copy of an API-backed Open Data Catalog
     * listing may be served from a browser cache before its listing is asked
     * again whether the source changed. The `open-data` edge function checks
     * the source at most once per `openDataFreshnessRecheckAfterMs` for every
     * workspace, so asking costs no request to the source most of the time.
     */
    openDataCopyMaxAgeMs: 15 * 60_000,

    /**
     * How long the `open-data` edge function reuses its last read of an
     * API-backed listing's freshness token before reading the source again.
     * It bounds requests to a third-party API by listing rather than by
     * workspace or by load.
     */
    openDataFreshnessRecheckAfterMs: 15 * 60_000,
  },

  /**
   * Limits on how the `connectors` edge function talks to a customer's
   * Postgres database. The function answers within 150 seconds or the
   * platform replies with a 504 instead, so the timeouts below are chosen to
   * report a slow database as `timeout` before that happens.
   */
  postgresConnector: {
    /** How long opening a connection to the database may take, in seconds. */
    connectTimeoutSeconds: 10,

    /** Longest any one catalog or preview statement may run, in ms. */
    catalogStatementTimeoutMs: 15_000,

    /**
     * Longest any one statement reading a relation's rows may run, in ms.
     * The rows arrive through a cursor whose every batch is its own
     * statement, so this bounds one batch, not the whole read.
     */
    rowsStatementTimeoutMs: 30_000,

    /**
     * Longest reading one relation's rows may take in all, in ms, checked
     * as each batch of rows arrives. The batch in flight when it passes can
     * still run for up to `rowsStatementTimeoutMs`, which keeps the request
     * inside the 150-second limit.
     */
    rowsReadDeadlineMs: 90_000,

    /**
     * How many rows each cursor batch asks the database for. Every batch is
     * one `FETCH`, so one network round trip. A row's width is unknown until
     * it arrives (a `text` or `jsonb` column can hold anything), so the first
     * batch asks for `minRows`. Each later batch is sized from the widest
     * row, in bytes, of the batch before it, to hold about `targetBytes` of
     * CSV, within
     * `minRows` and `maxRows`. A narrow table arrives in a few large batches
     * and a wide one in many small ones, so neither the round trips nor the
     * rows held in memory grow without bound.
     */
    rowsPerCursorBatch: {
      targetBytes: 8 * 1024 * 1024,
      minRows: 10,
      maxRows: 50_000,

      /**
       * The most a batch may grow over the batch before it, so the narrow
       * rows a table may start with never size the next batch straight to
       * `maxRows`. Once batches reach `maxRows`, only `maxRows` bounds the
       * next one: rows that widen after that arrive in one batch of
       * `maxRows` before the batch after it is sized for them.
       */
      maxGrowthFactor: 10,
    },

    /**
     * When the size check before a read trusts the planner's row estimate
     * instead of counting a relation's rows exactly, which scans all of
     * them. As fractions of `maxBytesPerAcquire`, at the relation's
     * estimated row width.
     */
    rowCountEstimate: {
      /** At or under this fraction of the cap, the estimate says it fits. */
      trustBelowCapFraction: 0.5,

      /**
       * Over this multiple of the cap, the estimate says it is too large.
       * Counting a relation that large exactly could itself outlast the
       * statement timeout, and the estimate scales with the relation's
       * current size on disk, so it is rarely off by this much.
       */
      trustAboveCapMultiple: 10,
    },

    /**
     * The most CSV one acquisition may return, in bytes. This is a memory
     * ceiling, not a free choice: an isolate is killed with a 546 at
     * whichever limit it hits first
     * (https://supabase.com/docs/guides/functions/limits), and the edge
     * function holds the driver rows, the CSV and the HTTP response body in
     * memory at once. 150MB stays under that ceiling with the overhead
     * included.
     */
    maxBytesPerAcquire: 150 * 1024 * 1024,
  },
} as const;

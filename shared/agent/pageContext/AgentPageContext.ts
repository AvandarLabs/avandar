/**
 * Where the user is in the app, as the agent sees it. `case-manager` is the
 * case designer, which has its own case-design chat; it is listed so a
 * route always maps to something.
 */
export type AgentPageApp =
  | "data-explorer"
  | "dashboards"
  | "dashboard"
  | "dataset"
  | "data-sources"
  | "map"
  | "case-type"
  | "case"
  | "case-manager"
  | "other";

/** A chart on the open dashboard. */
export type AgentPageTile = {
  title: string;
  chartType: string;
  /** The tile's SQL with DuckDB table names, as stored. */
  sql: string;
};

/**
 * What is on screen when the user sends a message. Holds metadata only:
 * names, SQL the user's page already shows, column names and types. Never
 * rows, and never a case's own details.
 */
export type AgentPageContext = {
  app: AgentPageApp;
  dataset?: { id: string; name: string };
  explorer?: {
    sql?: string;
    resultColumns: ReadonlyArray<{ name: string; dataType: string }>;
  };
  dashboard?: { id: string; name: string; tiles: readonly AgentPageTile[] };
  map?: { id: string; name: string };
  caseType?: { id: string; name: string };
};

/** Tiles listed in the block; the rest are counted. */
export const MAX_PAGE_TILES = 12;

/** Characters of any one SQL statement shown in the block. */
export const MAX_PAGE_SQL_CHARACTERS = 1_500;

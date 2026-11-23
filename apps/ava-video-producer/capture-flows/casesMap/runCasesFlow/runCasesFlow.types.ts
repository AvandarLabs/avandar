import type { FlowRecord } from "../../captureFlows.types";

/** The cases and visits datasets the case type reads its fields from. */
export type CaseSources = { cases: FlowRecord; visits: FlowRecord };

/** One fixture CSV row, by column name. */
export type FixtureRow = Record<string, string>;

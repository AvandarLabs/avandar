import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { SourceWrapper } from "$/models/relations/SourceWrapper/SourceWrapper.types";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

const CAPABILITIES = {
  /** One spreadsheet exposes one relation per named tab. */
  relations: "named-tabs",

  /**
   * A call names one A1 range of one tab and gets that range whole. Subranges
   * are addressable, but only by position, which is why paging a large sheet
   * is possible and combining pages into one consistent relation is not.
   */
  acquisitionUnit: { kind: "whole-range", positionalSubranges: true },

  /**
   * `values.get` accepts a range and nothing else: no filter, no ordering, no
   * aggregate. This is the declaration that stops anyone designing a Sheets
   * query optimizer.
   */
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",

  /** Google caps a response at roughly 10 MB, where it caps no row count. */
  maxBytesPerCall: 10 * 1024 * 1024,

  /** Drive reports `File.version`, which changes when the file changes. */
  freshnessSignal: "version-token",

  /**
   * A sheet row has no key and no server-side identity: inserting a row above
   * it renumbers it. With `multiCallAtomicity: false` this is what makes
   * stitching two partial fetches into one relation unsound by declaration.
   */
  rowIdentity: "none",
  multiCallAtomicity: false,

  /**
   * The Sheets API's read quota is 300 reads per minute per *project*, shared
   * across every tenant, so one workspace's import can throttle everyone.
   */
  quotaScope: { kind: "project-global", readsPerMinute: 300 },

  // Target scopes. `getAuthURL.ts` still requests `auth/spreadsheets`;
  // spec 4 drops it. Asserted against the request in spec 4, not here.
  grantedScope: ["openid", "email", "auth/drive.file"],
} satisfies RelationCapabilities;

/**
 * Declares what Google Sheets can be asked. Acquisition still refuses: making
 * it work is spec 4, and this wrapper exists so that spec adds a method body
 * rather than a branch.
 *
 * `acquire` is present and throws, which is exactly what happens today.
 * Omitting it instead would be a behaviour change, and this spec's budget is
 * zero. The two messages are the two the source-type match statement throws:
 * one when a Sheets dataset is resolved, one when its rows are fetched.
 */
export function createGoogleSheetsWrapper(): SourceWrapper<DatasetRef> {
  return {
    name: "google-sheets",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async () => {
      throw new Error("Google Sheets extraction is not supported yet");
    },

    acquire: async () => {
      throw new Error("Google Sheets data fetching is not supported yet");
    },
  };
}

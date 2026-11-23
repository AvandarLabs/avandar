import type { EtlScope } from "@avandar/etl";
import type { GhoDrive } from "@pipelines/gho/ghoDrive/ghoDrive";
import type { GhoEntitySetSchemas } from "@pipelines/gho/readGhoIndicatorSchemas/readGhoIndicatorSchemas";

/**
 * One GHO scope: `indicators` lists one listing per indicator, and
 * `dimensions` one listing per dimension's value list.
 */
export type GhoScope = EtlScope &
  Readonly<{ key: "indicators" | "dimensions" }>;

/**
 * The GHO drive as one run crawls it: with every indicator's declared
 * schema, read from `$metadata` once per run, and the time the run checked
 * GHO, which every listing it writes is stamped with.
 */
export type GhoCrawlDrive = GhoDrive &
  Readonly<{
    indicatorSchemas: GhoEntitySetSchemas;
    checkedAt: Date;
  }>;

/**
 * One of an indicator's newest rows, as the indicator probe reads it: its
 * modified time, and which dimension each code column holds.
 */
export type GhoIndicatorProbeRow = Readonly<{
  Date: string | null;
  SpatialDimType: string | null;
  Dim1Type: string | null;
  Dim2Type: string | null;
  Dim3Type: string | null;
  DataSourceDimType: string | null;
}>;

/** One indicator, probed: what `makeGhoIndicatorRelation` lists. */
export type GhoIndicatorConnection = Readonly<{
  kind: "indicator";
  /** The indicator's code, such as `WHS3_62`. */
  code: string;
  name: string;
  /** The indicator's record from `GET /Indicator`, as GHO sent it. */
  sourceRecord: unknown;
  rowCount: number;
  /** Up to the 1,000 newest rows, newest first. */
  probeRows: readonly GhoIndicatorProbeRow[];
  /** Whether its entity type declares exactly `GHO_FACT_COLUMNS`. */
  hasFactSchema: boolean;
}>;

/** One dimension, probed: what `makeGhoDimensionRelation` lists. */
export type GhoDimensionConnection = Readonly<{
  kind: "dimension";
  /** The dimension's code, such as `COUNTRY`. */
  code: string;
  title: string;
  /** The dimension's record from `GET /Dimension`, as GHO sent it. */
  sourceRecord: unknown;
  valueCount: number;
}>;

/** What `extractGhoDrive` yields for either scope. */
export type GhoConnection = GhoIndicatorConnection | GhoDimensionConnection;

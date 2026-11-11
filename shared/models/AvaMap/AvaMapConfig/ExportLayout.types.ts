import type { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** Paper sizes the export sheet offers. */
export type ExportPaper = (typeof AvaMapConfigValues.exportPapers)[number];

/** Page orientations the export sheet offers. */
export type ExportOrientation =
  (typeof AvaMapConfigValues.exportOrientations)[number];

/** One optional header line: whether it prints, and the author's text. */
export type ExportHeaderLine = { isVisible: boolean; text: string };

/** Which way a printed feature list sorts its chosen column. */
export type ExportFeatureListSortDirection =
  (typeof AvaMapConfigValues.exportFeatureListSortDirections)[number];

/** The column a printed feature list sorts by, and in which direction. */
export type ExportFeatureListSort = {
  columnId: QueryColumn.Id;
  direction: ExportFeatureListSortDirection;
};

/**
 * One layer's features, printed as a table on the pages after the map.
 *
 * `columnIds` are query columns of the layer, in the layer's column order.
 * `sort` unset means the list's own default order, which puts the nearest
 * feature first when a buffer filters the layer. `maxRows` caps the printed
 * rows between 1 and 1,000.
 */
export type ExportFeatureList = {
  layerId: MapLayer.Id;
  columnIds: readonly QueryColumn.Id[];
  sort: ExportFeatureListSort | undefined;
  maxRows: number;
};

/**
 * Persisted export furniture. Reopening Export shows the last sitrep, so two
 * exports of one saved map cannot disagree.
 *
 * Empty `title.text`, `subtitle.text`, and `sourceLine` mean "use the live
 * fallback"; the sheet shows that fallback as a placeholder. `disclaimer`
 * unset means the Lingui default at display time, which is why `""` is
 * rejected rather than stored: a blank disclaimer must be impossible.
 *
 * The camera and the production date are deliberately absent. The camera is
 * whatever is on screen, and the date is the instant of download, so a
 * forwarded sitrep cannot look like it was produced at save time.
 */
export type ExportLayout = {
  paper: ExportPaper;
  orientation: ExportOrientation;
  title: ExportHeaderLine;
  subtitle: ExportHeaderLine;
  northArrow: boolean;
  scaleBar: boolean;
  sourceLine: string;
  disclaimer: string | undefined;

  /**
   * A feature list printed after the map, or unset for none. Cleared when
   * its layer is removed from the map.
   */
  featureList: ExportFeatureList | undefined;
};

import type { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";

/** Paper sizes the export sheet offers. */
export type ExportPaper = (typeof AvaMapConfigValues.exportPapers)[number];

/** Page orientations the export sheet offers. */
export type ExportOrientation =
  (typeof AvaMapConfigValues.exportOrientations)[number];

/** One optional header line: whether it prints, and the author's text. */
export type ExportHeaderLine = { isVisible: boolean; text: string };

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
};

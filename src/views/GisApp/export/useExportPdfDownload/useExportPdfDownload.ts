import { formatDate, isDefined } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { BasemapStyle } from "@/views/GisApp/basemap/BasemapStyle";
import { captureExportMapCanvas } from "@/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas";
import { composeExportPdf } from "@/views/GisApp/export/composeExportPdf/composeExportPdf";
import { ExportPageLayout } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";
import { getExportFilename } from "@/views/GisApp/export/getExportFilename/getExportFilename";
import { getExportFilterReadout } from "@/views/GisApp/export/getExportFilterReadout/getExportFilterReadout";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";
import { getExportMetersPerPixel } from "@/views/GisApp/export/getExportMetersPerPixel/getExportMetersPerPixel";
import { makeExportMapSpec } from "@/views/GisApp/export/makeExportMapSpec/makeExportMapSpec";
import { MapScale } from "@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale";
import type { ExportPdfInput } from "@/views/GisApp/export/composeExportPdf/composeExportPdf";
import type { ExportLegendEntry } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";
import type { ExportPageGeometry } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";
import type { ExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { I18n, MessageDescriptor } from "@lingui/core";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * How much of the printed map frame's width a scale label may claim, chosen
 * so the "nice" distance stays a small fraction of the map's full span, the
 * same relationship the on-screen bar (a small, fixed width against a much
 * wider viewport) already has.
 */
const SCALE_LABEL_WIDTH_DIVISOR = 6;

export type ExportDownloadStatus = "idle" | "pending" | "success" | "error";

/** Everything one PDF download needs that is not resolved at download time. */
export type UseExportPdfDownloadInput = {
  config: AvaMapConfig.T;
  spec: MapSpec;
  view: AvaMapConfig.ViewState;
  mapName: string;
  workspaceName: string;
  basemapAttribution: string;
  legendEntries: readonly ExportLegendEntry[];
  hasDrawnDisputedFeature: boolean;
};

type UseExportPdfDownloadResult = {
  status: ExportDownloadStatus;
  errorMessage: string | undefined;
  download: () => Promise<void>;
};

/** Every localized string `composeExportPdf` needs, already resolved. */
type ResolvedExportStrings = {
  text: ExportFurnitureText;
  disclaimer: string;
  filterReadoutLines: string[];
  disputedLegendLabel: string;
  scaleLabel: string | undefined;
  producedAtLabel: string;
  filename: string;
};

/**
 * Resolves spec §4.2's scale rule via the single shared `MapScale`
 * implementation: unset when the author turned the bar off, the localized
 * "varies" caveat below zoom 4, or the distance string formatted exactly as
 * the on-screen furniture bar formats it.
 *
 * Returns a `MessageDescriptor` rather than a resolved string: every helper
 * in this module builds descriptors with `msg`, never `t`, because `t` only
 * compiles correctly when called in the same function scope as its
 * `useLingui()` call. The caller resolves the descriptor with `i18n._()`.
 */
function _getScaleDescriptor(
  options: Readonly<{
    exportLayout: AvaMapConfig.ExportLayout;
    view: AvaMapConfig.ViewState;
    mapCanvasPx: Readonly<{ width: number; height: number }>;
  }>,
): MessageDescriptor | undefined {
  const { exportLayout, view, mapCanvasPx } = options;
  if (!exportLayout.scaleBar) {
    return undefined;
  }
  const scale = MapScale.fromMetersPerPixel({
    metersPerPixel: getExportMetersPerPixel(view),
    zoom: view.zoom,
    maxWidthPx: mapCanvasPx.width / SCALE_LABEL_WIDTH_DIVISOR,
  });
  if (scale.kind === "varies") {
    return msg`Scale varies across this map`;
  }
  return scale.meters >= 1000 ?
      msg`${scale.meters / 1000} km`
    : msg`${scale.meters} m`;
}

/** Builds the localized filter-readout descriptors the sheet discloses. */
function _getFilterReadoutDescriptors(
  config: AvaMapConfig.T,
): MessageDescriptor[] {
  const readout = getExportFilterReadout(config);
  return [
    readout.timeWindow !== undefined ?
      msg`Dates: ${readout.timeWindow}`
    : undefined,
    readout.hasAoi ? msg`Area of interest applied` : undefined,
  ].filter(isDefined);
}

/**
 * Formats the production instant, pinned to UTC.
 *
 * `formatDate` resolves the reader's own locale for the month name, so no
 * locale is threaded here. UTC keeps the printed date tied to the instant of
 * download rather than to the exporting machine's zone.
 */
function _formatProducedAt(producedAt: Date): string {
  return formatDate(producedAt, { zone: "UTC", format: "D MMM YYYY" });
}

/** A localized, user-facing message for a capture or compose failure. */
function _getErrorMessage(error: unknown, i18n: I18n): string {
  const detail = error instanceof Error ? error.message : String(error);
  return i18n._(msg`The PDF could not be created: ${detail}`);
}

/**
 * Resolves every displayable string `composeExportPdf` needs, so the hook's
 * `download` function stays a short, linear pipeline. `i18n` is a plain
 * runtime object (not a macro), so it is safe to pass into this ordinary
 * helper: the same is not true of `t`.
 */
function _buildExportStrings(
  options: Readonly<{
    config: AvaMapConfig.T;
    view: AvaMapConfig.ViewState;
    mapName: string;
    basemapAttribution: string;
    page: ExportPageGeometry;
    producedAt: Date;
    i18n: I18n;
  }>,
): ResolvedExportStrings {
  const { config, view, mapName, basemapAttribution, page, producedAt, i18n } =
    options;
  const text = getExportFurnitureText({ config, mapName, basemapAttribution });
  const scaleDescriptor = _getScaleDescriptor({
    exportLayout: config.exportLayout,
    view,
    mapCanvasPx: page.mapCanvasPx,
  });
  return {
    text,
    disclaimer:
      config.exportLayout.disclaimer ??
      i18n._(
        msg`The boundaries and names shown do not imply official endorsement or acceptance.`,
      ),
    filterReadoutLines: _getFilterReadoutDescriptors(config).map(
      (descriptor) => {
        return i18n._(descriptor);
      },
    ),
    disputedLegendLabel: i18n._(msg`Disputed or undetermined boundary`),
    scaleLabel:
      scaleDescriptor === undefined ? undefined : i18n._(scaleDescriptor),
    producedAtLabel: i18n._(
      msg`Produced ${_formatProducedAt(producedAt)}`,
    ),
    filename: getExportFilename({ title: text.title ?? mapName, producedAt }),
  };
}

/** Assembles the full `composeExportPdf` input from the resolved strings. */
function _buildComposePdfInput(
  options: Readonly<{
    canvas: HTMLCanvasElement;
    page: ExportPageGeometry;
    config: AvaMapConfig.T;
    strings: ResolvedExportStrings;
    input: UseExportPdfDownloadInput;
    i18n: I18n;
  }>,
): ExportPdfInput {
  const { canvas, page, config, strings, input, i18n } = options;
  return {
    canvas,
    page,
    layout: config.exportLayout,
    text: strings.text,
    workspaceName: input.workspaceName,
    disclaimer: strings.disclaimer,
    filterReadoutLines: strings.filterReadoutLines,
    legendEntries: input.legendEntries,
    hasDrawnDisputedFeature: input.hasDrawnDisputedFeature,
    disputedLegendLabel: strings.disputedLegendLabel,
    scaleLabel: strings.scaleLabel,
    producedAtLabel: strings.producedAtLabel,
    filename: strings.filename,
    pageNumberLabel: ({ page: pageNumber, total }) => {
      return i18n._(msg`Page ${pageNumber} of ${total}`);
    },
  };
}

/**
 * Orchestrates one PDF download: resolves page geometry, captures the
 * offscreen export map, resolves every displayable string through Lingui,
 * and hands `composeExportPdf` a fully finished, localized input.
 *
 * The production date is read with `new Date()` inside `download()`, not in
 * the hook body, so a sitrep forwarded long after it was rendered still
 * prints the day it was actually downloaded. A rejection from capture or
 * compose sets `status: "error"` with a localized message and never reaches
 * the next step, so a failed export writes no file; calling `download`
 * again retries from a clean slate.
 */
export function useExportPdfDownload(
  input: Readonly<UseExportPdfDownloadInput>,
): UseExportPdfDownloadResult {
  const { i18n } = useLingui();
  const [status, setStatus] = useState<ExportDownloadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const download = async (): Promise<void> => {
    setStatus("pending");
    setErrorMessage(undefined);
    try {
      const { config, spec, view, mapName, basemapAttribution } = input;
      const page = ExportPageLayout.fromLayout(config.exportLayout);
      const exportSpec = makeExportMapSpec({
        spec,
        annotations: config.annotations,
      });
      const canvas = await captureExportMapCanvas({
        spec: exportSpec,
        styleUrl: BasemapStyle.fromBasemap(config.basemap),
        view,
        mapCanvasPx: page.mapCanvasPx,
      });

      const producedAt = new Date();
      const strings = _buildExportStrings({
        config,
        view,
        mapName,
        basemapAttribution,
        page,
        producedAt,
        i18n,
      });
      await composeExportPdf(
        _buildComposePdfInput({ canvas, page, config, strings, input, i18n }),
      );
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(_getErrorMessage(error, i18n));
    }
  };

  return { status, errorMessage, download };
}

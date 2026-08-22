import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { CSSProperties, ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { ExportPageLayout } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";
import css from "@/views/GisApp/export/ExportSheet/ExportSheetPreview/ExportSheetPreview.module.css";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";

type Props = {
  config: AvaMapConfig.T;
  mapName: string;
  basemapAttribution: string;
};

/** Preview width, in CSS px; height follows the paper's aspect ratio. */
const PREVIEW_WIDTH_PX = 260;

/** A millimetre rectangle, scaled to preview pixels. */
type RectMm = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Converts one millimetre rectangle to an absolutely-positioned CSS style. */
function _toStyle(rect: RectMm, scale: number): CSSProperties {
  return {
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

/**
 * A miniature, non-interactive preview of the export page.
 *
 * It reuses the exact geometry `ExportPageLayout` and `composeExportPdf`
 * work from, scaled down, so what the author sees here is proportioned like
 * the PDF they are about to download rather than a separately-imagined
 * layout. The whole preview carries a single `role="img"` and one
 * accessible name: its internal bands are presentation only, not a tree of
 * unlabeled boxes a screen reader would otherwise announce one at a time.
 */
export function ExportSheetPreview({
  config,
  mapName,
  basemapAttribution,
}: Props): ReactNode {
  const { t } = useLingui();
  const page = ExportPageLayout.fromLayout(config.exportLayout);
  const text = getExportFurnitureText({ config, mapName, basemapAttribution });
  const scale = PREVIEW_WIDTH_PX / page.pageMm.width;

  return (
    <div
      role="img"
      aria-label={t`Export preview`}
      className={css.exportSheetPreviewPage}
      style={{
        width: page.pageMm.width * scale,
        height: page.pageMm.height * scale,
      }}
    >
      <div
        className={`${css.exportSheetPreviewBand} ${css.exportSheetPreviewHeader}`}
        style={_toStyle(page.headerMm, scale)}
      >
        {text.title !== undefined ? (
          <span className={css.exportSheetPreviewText}>{text.title}</span>
        ) : null}
      </div>
      <div
        className={`${css.exportSheetPreviewBand} ${css.exportSheetPreviewMapFrame}`}
        style={_toStyle(page.mapFrameMm, scale)}
      />
      <div
        className={`${css.exportSheetPreviewBand} ${css.exportSheetPreviewLegend}`}
        style={_toStyle(page.legendMm, scale)}
      />
      <div
        className={`${css.exportSheetPreviewBand} ${css.exportSheetPreviewFooter}`}
        style={_toStyle(page.footerMm, scale)}
      >
        <span className={css.exportSheetPreviewText}>{text.sourceLine}</span>
      </div>
    </div>
  );
}

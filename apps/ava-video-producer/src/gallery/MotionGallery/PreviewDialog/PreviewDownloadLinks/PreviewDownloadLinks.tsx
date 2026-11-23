import { getReferenceUrlFromPreset } from "../../getReferenceUrlFromPreset";
import { Icon } from "../../Icon";
import { usePreviewDownload } from "../usePreviewDownload";
import css from "./PreviewDownloadLinks.module.css";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";

type Props = Pick<PreviewProps, "preset" | "onCopy" | "contentState"> &
  Pick<
    ReturnType<typeof usePreviewDownload>,
    "download" | "exporting" | "canExport"
  >;
/**
 * Copies a reference URL or downloads the configured motion from
 * PreviewDetails.
 */
export function PreviewDownloadLinks({
  preset,
  onCopy,
  download,
  exporting,
  contentState,
  canExport,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewDownloadLinksDetailLinks}>
      <button
        onClick={() => {
          return onCopy(
            `${preset.name} (${preset.id})\n${getReferenceUrlFromPreset(preset)}`,
            "Reference link copied",
          );
        }}
      >
        <Icon name="copy" size={14} />
        Copy link
      </button>
      <button
        onClick={download}
        disabled={exporting || !contentState.isValid || !canExport}
      >
        <Icon name="download" size={14} />
        {exporting ? "Rendering MP4…" : "Download MP4"}
      </button>
    </div>
  );
}

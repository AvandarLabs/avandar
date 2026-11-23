import { clsx } from "clsx";
import css from "./DownloadButton.module.css";
import type { CompositionExportOptions } from "../../compositionExportOptions/compositionExportOptions";
import type { ThemeExportState } from "../../ThemeExportState/ThemeExportState";
import type { useCompositionDownload } from "../useCompositionDownload";
import type { ReactNode } from "react";

type Props = Readonly<{
  download: ReturnType<typeof useCompositionDownload>;
  options: CompositionExportOptions | undefined;
  themeState: ThemeExportState;
  /** The notice that explains a blocked download. */
  noticeId: string;
}>;
/**
 * The download label. A blocked download keeps its label and explains itself in
 * the notice.
 */
function _downloadLabel({
  isBusy,
  options,
  themeState,
}: Readonly<{
  isBusy: boolean;
  options: CompositionExportOptions | undefined;
  themeState: ThemeExportState;
}>): string {
  if (isBusy) {
    return "Preparing export…";
  }
  return options === undefined
    ? "Loading preview…"
    : themeState.kind === "pending"
      ? "Applying design tokens…"
      : "Download MP4";
}
/**
 * Download MP4, enabled once the player shows the options and theme the export
 * will use.
 */
export function DownloadButton({
  download,
  options,
  themeState,
  noticeId,
}: Props): ReactNode {
  const label = _downloadLabel({
    isBusy: download.busy,
    options,
    themeState,
  });
  const isBlocked =
    themeState.kind === "refused" || themeState.kind === "timed-out";
  return (
    <button
      className={clsx(
        css.downloadButton,
        isBlocked && css.downloadButtonIsBlocked,
      )}
      disabled={
        download.busy || options === undefined || themeState.kind !== "ready"
      }
      aria-busy={download.busy}
      aria-describedby={isBlocked ? noticeId : undefined}
      onClick={() => {
        return void download.start();
      }}
    >
      {label}
    </button>
  );
}

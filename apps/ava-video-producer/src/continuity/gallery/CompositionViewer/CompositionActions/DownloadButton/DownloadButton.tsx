import clsx from "clsx";
import css from "./DownloadButton.module.css";
import type { CompositionExportOptions } from "../../compositionExportOptions";
import type { ThemeExportState } from "../../themeExportStateHelpers/themeExportStateHelpers";
import type { useCompositionDownload } from "../useCompositionDownload";

type Props = Readonly<{
  download: ReturnType<typeof useCompositionDownload>;
  options: CompositionExportOptions | undefined;
  themeState: ThemeExportState;
  /** The notice that explains a blocked download. */
  noticeId: string;
}>;

/** The download label. A blocked download keeps its label and explains itself in the notice. */
function _downloadLabel(
  isBusy: boolean,
  options: CompositionExportOptions | undefined,
  themeState: ThemeExportState,
): string {
  if (isBusy) {
    return "Preparing export…";
  }
  if (options === undefined) {
    return "Loading preview…";
  }
  return themeState.kind === "pending"
    ? "Applying design tokens…"
    : "Download MP4";
}

/** Download MP4, enabled once the player shows the options and theme the export will use. */
export function DownloadButton({
  download,
  options,
  themeState,
  noticeId,
}: Props) {
  const label = _downloadLabel(download.busy, options, themeState);
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
      onClick={() => void download.start()}
    >
      {label}
    </button>
  );
}

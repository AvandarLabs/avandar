import { useId, useState } from "react";
import css from "./CompositionActions.module.css";
import { DownloadButton } from "./DownloadButton/DownloadButton";
import {
  CAPTION_DOWNLOAD_IDLE,
  finishCaptionDownload,
  startCaptionDownload,
} from "./downloadCaptionFile/captionDownloadStateHelpers/captionDownloadStateHelpers";
import {
  type CaptionDownloadOptions,
  downloadCaptionFile,
} from "./downloadCaptionFile/downloadCaptionFile";
import { ThemeExportNotice } from "./ThemeExportNotice/ThemeExportNotice";
import { useCompositionDownload } from "./useCompositionDownload";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";
import type { ThemeExportState } from "../themeExportStateHelpers/themeExportStateHelpers";
import type { ReactNode } from "react";

type Props = Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  /**
   * Scene studies carry no narration, so they offer no transcript or captions.
   */
  isScene: boolean;
  /** The theme the export renders with, unsaved edits included. */
  theme: ExportTheme;
  /**
   * Whether the live player shows this theme, so the MP4 will match the
   * preview.
   */
  themeState: ThemeExportState;
  /** Sends the theme to the player again after it timed out. */
  onRetryTheme: () => void;
}>;

/**
 * Explicit exports use only the options and theme the live player acknowledged.
 */
export function CompositionActions({
  id,
  captions,
  options,
  isScene,
  theme,
  themeState,
  onRetryTheme,
}: Props): ReactNode {
  const noticeId = useId();
  const download = useCompositionDownload({
    id,
    captions,
    options,
    theme: isScene ? undefined : theme,
  });
  return (
    <div className={css.compositionActions}>
      <div className={css.compositionActionsLinks}>
        <DownloadButton
          download={download}
          options={options}
          themeState={themeState}
          noticeId={noticeId}
        />
        {isScene ? null : (
          <NarrationLinks id={id} options={options} theme={theme} />
        )}
      </div>
      <ThemeExportNotice
        id={noticeId}
        state={themeState}
        onRetry={onRetryTheme}
      />
      <p className={css.compositionActionsStatus} role="status">
        {download.status}
      </p>
    </div>
  );
}

/** Starts a caption download and reports a refused one. */
function useCaptionDownload(
  id: string,
  options: CaptionDownloadOptions,
): { isBusy: boolean; hasFailed: boolean; start: () => void } {
  const [state, setState] = useState(CAPTION_DOWNLOAD_IDLE);
  return {
    isBusy: state.busyId !== undefined,
    hasFailed: state.failedId === id,
    start: () => {
      const started = startCaptionDownload(state, id);
      if (!started) {
        return;
      }
      setState(started);
      downloadCaptionFile({ id, options }).then(
        () => {
          return setState((current) => {
            return finishCaptionDownload(current, { id, hasFailed: false });
          });
        },
        () => {
          return setState((current) => {
            return finishCaptionDownload(current, { id, hasFailed: true });
          });
        },
      );
    },
  };
}

/**
 * Transcript and caption downloads. Captions are timed by the camera tokens,
 * so they take the same options and theme as the MP4 export, draft included.
 */
function NarrationLinks({
  id,
  options,
  theme,
}: Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  theme: ExportTheme;
}>) {
  const cameraMotion =
    options && "cameraMotion" in options ? options.cameraMotion : true;
  const captions = useCaptionDownload(id, { cameraMotion, theme });
  return (
    <>
      <a href={`/api/films/${encodeURIComponent(id)}/transcript.txt`} download>
        {"Transcript"}
      </a>
      <button
        type="button"
        className={css.compositionActionsLink}
        disabled={captions.isBusy}
        aria-busy={captions.isBusy}
        onClick={captions.start}
      >
        {"Captions"}
      </button>
      {captions.hasFailed ? (
        <span role="alert">
          {
            "Captions could not be made with these settings. Check the showcase terminal."
          }
        </span>
      ) : null}
    </>
  );
}

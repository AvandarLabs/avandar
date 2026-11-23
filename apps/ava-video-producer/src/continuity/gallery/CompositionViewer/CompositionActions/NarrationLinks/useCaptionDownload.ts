import { useState } from "react";
import {
  CAPTION_DOWNLOAD_IDLE,
  CaptionDownloadState,
} from "../downloadCaptionFile/CaptionDownloadState/CaptionDownloadState";
import { downloadCaptionFile } from "../downloadCaptionFile/downloadCaptionFile";
import type { CaptionDownloadOptions } from "../downloadCaptionFile/downloadCaptionFile";
/** Starts a caption download and reports a refused one. */
export function useCaptionDownload({
  id,
  options,
}: Readonly<{
  id: string;
  options: CaptionDownloadOptions;
}>): {
  isBusy: boolean;
  hasFailed: boolean;
  start: () => void;
} {
  const [state, setState] = useState(CAPTION_DOWNLOAD_IDLE);
  return {
    isBusy: state.busyId !== undefined,
    hasFailed: state.failedId === id,
    start: () => {
      const started = CaptionDownloadState.startCaptionDownload({
        state,
        id,
      });
      if (!started) {
        return;
      }
      setState(started);
      downloadCaptionFile({ id, options }).then(
        () => {
          return setState((current) => {
            return CaptionDownloadState.finishCaptionDownload({
              state: current,
              options: { id, hasFailed: false },
            });
          });
        },
        () => {
          return setState((current) => {
            return CaptionDownloadState.finishCaptionDownload({
              state: current,
              options: { id, hasFailed: true },
            });
          });
        },
      );
    },
  };
}

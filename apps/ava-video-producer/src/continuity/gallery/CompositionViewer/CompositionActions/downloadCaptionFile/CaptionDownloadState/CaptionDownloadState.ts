/** Which film's caption download is running, and which one last failed. */
export type CaptionDownloadState = Readonly<{
  busyId?: string;
  failedId?: string;
}>;
/** No caption download running and no failure to report. */
export const CAPTION_DOWNLOAD_IDLE: CaptionDownloadState = {};
/**
 * The state once a caption download starts, clearing any earlier failure,
 * or undefined while one is already running, so a double click sends one
 * request.
 */
function _startCaptionDownload({
  state,
  id,
}: Readonly<{
  state: CaptionDownloadState;
  id: string;
}>): CaptionDownloadState | undefined {
  return state.busyId === undefined ? { busyId: id } : undefined;
}
/** The state once a film's caption download finishes or fails. */
function _finishCaptionDownload({
  state,
  options,
}: Readonly<{
  state: CaptionDownloadState;
  options: {
    id: string;
    hasFailed: boolean;
  };
}>): CaptionDownloadState {
  const { id, hasFailed } = options;
  if (state.busyId !== id) {
    return state;
  }
  return hasFailed ? { failedId: id } : CAPTION_DOWNLOAD_IDLE;
}

/** Tracks in-flight caption downloads for CompositionActions feedback. */
export const CaptionDownloadState = {
  /**
   * The state once a caption download starts, clearing any earlier failure, or
   * undefined while one is already running, so a double click sends one
   * request.
   */
  startCaptionDownload: _startCaptionDownload,
  /** The state once a film's caption download finishes or fails. */
  finishCaptionDownload: _finishCaptionDownload,
};

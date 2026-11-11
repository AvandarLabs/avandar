import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionActions.module.css";
import { useCompositionDownload } from "./useCompositionDownload";
import type { CompositionExportOptions } from "../compositionExportOptions";

type Props = {
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  /** Scene studies carry no narration, so they offer no transcript or captions. */
  isScene: boolean;
};

/** Explicit exports use only the caption options acknowledged by the live player. */
export function CompositionActions({ id, captions, options, isScene }: Props) {
  const translate = useContinuityCopy();
  const download = useCompositionDownload({ id, captions, options });
  const label = download.busy
    ? "Preparing export…"
    : options === undefined
      ? "Loading preview…"
      : "Download MP4";
  return (
    <div className={css.compositionActions}>
      <div className={css.compositionActionsLinks}>
        <button
          className={css.compositionActionsDownload}
          disabled={download.busy || options === undefined}
          aria-busy={download.busy}
          onClick={() => void download.start()}
        >
          {translate(label)}
        </button>
        {!isScene && <NarrationLinks id={id} options={options} />}
      </div>
      <p className={css.compositionActionsStatus} role="status">
        {translate(download.status)}
      </p>
    </div>
  );
}

/** Transcript and caption downloads for a narrated continuity composition. */
function NarrationLinks({
  id,
  options,
}: {
  id: string;
  options: CompositionExportOptions | undefined;
}) {
  const translate = useContinuityCopy();
  const appearance = options && "cameraPreset" in options ? options : undefined;
  const captionQuery = new URLSearchParams({
    cameraPreset: appearance?.cameraPreset ?? "authored",
    cameraMotion: String(appearance?.cameraMotion ?? true),
  });
  return (
    <>
      <a href={`/api/films/${encodeURIComponent(id)}/transcript.txt`} download>
        {translate("Transcript")}
      </a>
      <a
        href={`/api/films/${encodeURIComponent(id)}/captions.srt?${captionQuery}`}
        download
      >
        {translate("Captions")}
      </a>
    </>
  );
}

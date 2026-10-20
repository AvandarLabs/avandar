import type { ContinuityAppearance } from "../../../continuityAppearance";
import { useContinuityCopy } from "../../../useContinuityCopy";
import { useCompositionDownload } from "./useCompositionDownload";
import css from "./CompositionActions.module.css";

type Props = {
  id: string;
  options: ContinuityAppearance | undefined;
  captions: boolean | undefined;
};

/** Explicit exports use only the caption options acknowledged by the live player. */
export function CompositionActions({ id, captions, options }: Props) {
  const translate = useContinuityCopy();
  const download = useCompositionDownload({ id, captions, options });
  const captionQuery = new URLSearchParams({
    cameraPreset: options?.cameraPreset ?? "authored",
    cameraMotion: String(options?.cameraMotion ?? true),
  });
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
        <a
          href={`/api/films/${encodeURIComponent(id)}/transcript.txt`}
          download
        >
          {translate("Transcript")}
        </a>
        <a
          href={`/api/films/${encodeURIComponent(id)}/captions.srt?${captionQuery}`}
          download
        >
          {translate("Captions")}
        </a>
      </div>
      <p className={css.compositionActionsStatus} role="status">
        {translate(download.status)}
      </p>
    </div>
  );
}

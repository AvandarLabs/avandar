import { useLingui } from "@lingui/react/macro";
import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionActions.module.css";
import { useCompositionDownload } from "./useCompositionDownload";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";

type Props = Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  /** Scene studies carry no narration, so they offer no transcript or captions. */
  isScene: boolean;
  /** The theme the export renders with, unsaved edits included. */
  theme: ExportTheme;
  /** The live player shows this theme, so the MP4 will match the preview. */
  isThemeReady: boolean;
  /** The camera preset in effect, which changes caption timing. */
  cameraPreset: string;
}>;

/** Explicit exports use only the options and theme the live player acknowledged. */
export function CompositionActions({
  id,
  captions,
  options,
  isScene,
  theme,
  isThemeReady,
  cameraPreset,
}: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const download = useCompositionDownload({
    id,
    captions,
    options,
    theme: isScene ? undefined : theme,
  });
  const isReady = options !== undefined && isThemeReady;
  const label = download.busy
    ? translate("Preparing export…")
    : options === undefined
      ? translate("Loading preview…")
      : isThemeReady
        ? translate("Download MP4")
        : t`Applying design tokens…`;
  return (
    <div className={css.compositionActions}>
      <div className={css.compositionActionsLinks}>
        <button
          className={css.compositionActionsDownload}
          disabled={download.busy || !isReady}
          aria-busy={download.busy}
          onClick={() => void download.start()}
        >
          {label}
        </button>
        {!isScene && (
          <NarrationLinks
            id={id}
            options={options}
            themeId={theme.id}
            cameraPreset={cameraPreset}
          />
        )}
      </div>
      <p className={css.compositionActionsStatus} role="status">
        {translate(download.status)}
      </p>
    </div>
  );
}

/** Transcript and caption downloads, timed by the theme's camera preset. */
function NarrationLinks({
  id,
  options,
  themeId,
  cameraPreset,
}: Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  themeId: string;
  cameraPreset: string;
}>) {
  const translate = useContinuityCopy();
  const cameraMotion =
    options && "cameraMotion" in options ? options.cameraMotion : true;
  const captionQuery = new URLSearchParams({
    theme: themeId,
    cameraPreset,
    cameraMotion: String(cameraMotion),
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

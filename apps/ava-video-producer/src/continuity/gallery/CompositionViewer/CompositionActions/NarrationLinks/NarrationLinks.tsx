import css from "./NarrationLinks.module.css";
import { useCaptionDownload } from "./useCaptionDownload";
import type { ExportTheme } from "../../../../../videoThemeEditor/ThemeDrafts/ThemeDrafts";
import type { CompositionExportOptions } from "../../compositionExportOptions/compositionExportOptions";
import type { ReactNode } from "react";

type Props = {
  id: string;
  options: CompositionExportOptions | undefined;
  theme: ExportTheme;
};
/**
 * Transcript and caption downloads. Captions are timed by the camera tokens,
 * so they take the same options and theme as the MP4 export, draft included.
 */
export function NarrationLinks({
  id,
  options,
  theme,
}: Readonly<Props>): ReactNode {
  const cameraMotion =
    options && "cameraMotion" in options ? options.cameraMotion : true;
  const captions = useCaptionDownload({
    id,
    options: { cameraMotion, theme },
  });
  return (
    <>
      <a href={`/api/films/${encodeURIComponent(id)}/transcript.txt`} download>
        {"Transcript"}
      </a>
      <button
        type="button"
        className={css.narrationLinksCaption}
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

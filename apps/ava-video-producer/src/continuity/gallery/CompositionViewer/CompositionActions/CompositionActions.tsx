import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useId } from "react";
import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionActions.module.css";
import { ThemeExportNotice } from "./ThemeExportNotice";
import { useCompositionDownload } from "./useCompositionDownload";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";
import type { ThemeExportState } from "../themeExportState/themeExportState";

type Props = Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  /** Scene studies carry no narration, so they offer no transcript or captions. */
  isScene: boolean;
  /** The theme the export renders with, unsaved edits included. */
  theme: ExportTheme;
  /** Whether the live player shows this theme, so the MP4 will match the preview. */
  themeState: ThemeExportState;
  /** Sends the theme to the player again after it timed out. */
  onRetryTheme: () => void;
  /** The camera preset in effect, which changes caption timing. */
  cameraPreset: string;
}>;

/** The download label. A blocked download keeps its label and explains itself in the notice. */
function useDownloadLabel(
  isBusy: boolean,
  options: CompositionExportOptions | undefined,
  themeState: ThemeExportState,
): string {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  if (isBusy) {
    return translate("Preparing export…");
  }
  if (options === undefined) {
    return translate("Loading preview…");
  }
  return themeState.kind === "pending"
    ? t`Applying design tokens…`
    : translate("Download MP4");
}

type DownloadButtonProps = Readonly<{
  download: ReturnType<typeof useCompositionDownload>;
  options: CompositionExportOptions | undefined;
  themeState: ThemeExportState;
  /** The notice that explains a blocked download. */
  noticeId: string;
}>;

/** Download MP4, enabled once the player shows the options and theme the export will use. */
function DownloadButton({
  download,
  options,
  themeState,
  noticeId,
}: DownloadButtonProps) {
  const label = useDownloadLabel(download.busy, options, themeState);
  const isBlocked =
    themeState.kind === "refused" || themeState.kind === "timed-out";
  return (
    <button
      className={clsx(
        css.compositionActionsDownload,
        isBlocked && css.isBlocked,
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

/** Explicit exports use only the options and theme the live player acknowledged. */
export function CompositionActions(props: Props) {
  const { id, options, isScene, theme, themeState } = props;
  const translate = useContinuityCopy();
  const noticeId = useId();
  const download = useCompositionDownload({
    id,
    captions: props.captions,
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
        {!isScene && (
          <NarrationLinks
            id={id}
            options={options}
            themeId={theme.id}
            cameraPreset={props.cameraPreset}
          />
        )}
      </div>
      <ThemeExportNotice
        id={noticeId}
        state={themeState}
        onRetry={props.onRetryTheme}
      />
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

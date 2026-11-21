import { useId } from "react";
import css from "./CompositionActions.module.css";
import { DownloadButton } from "./DownloadButton/DownloadButton";
import { NarrationLinks } from "./NarrationLinks/NarrationLinks";
import { ThemeExportNotice } from "./ThemeExportNotice/ThemeExportNotice";
import { useCompositionDownload } from "./useCompositionDownload";
import type { ExportTheme } from "../../../../videoThemeEditor/ThemeDrafts/ThemeDrafts";
import type { CompositionExportOptions } from "../compositionExportOptions/compositionExportOptions";
import type { ThemeExportState } from "../ThemeExportState/ThemeExportState";
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
    <div>
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

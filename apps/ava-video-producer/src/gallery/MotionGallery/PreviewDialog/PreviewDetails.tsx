import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { ContentControls } from "../ContentControls/ContentControls";
import { getReferenceUrlFromPreset } from "../getReferenceUrlFromPreset";
import { Icon } from "../Icon";
import { makeStockRequestFromConfiguration } from "../makeStockRequestFromConfiguration";
import { PaletteControls } from "../PaletteControls";
import { useReferenceBrief } from "../useReferenceBrief";
import { usePreviewDownload } from "./usePreviewDownload";
import type { Props as PreviewProps } from "./PreviewDialogContent";
import type { ReactNode } from "react";
/**
 * Details, content editing, reference actions, and export status for one
 * motion.
 */
export type Props = Omit<PreviewProps, "initialPlaying">;
/** Presents the motion description, editable content, and reference actions. */
export function PreviewDetails({
  preset,
  contentState,
  onContentChange,
  saved,
  onSave,
  onCopy,
  notice,
  accent,
  background,
  setAccent,
  setBackground,
}: Readonly<Props>): ReactNode {
  const { t } = useGalleryLingui();
  const referenceBrief = useReferenceBrief();
  const { exporting, exportStatus, download } = usePreviewDownload({
    preset,
    contentState,
    accent,
    background,
  });
  return (
    <div className="dialog-details">
      <p className="dialog-description" id="dialog-description">
        {preset.description}
      </p>
      <PaletteControls
        accent={accent}
        background={background}
        setAccent={setAccent}
        setBackground={setBackground}
      />
      <ContentControls
        preset={preset.id}
        state={contentState}
        onChange={onContentChange}
      />
      <div className="detail-section">
        <h3>
          <Trans>Good for</Trans>
        </h3>
        <p>{preset.useWhen}</p>
      </div>
      <div className="keyword-list" aria-label={t`Keywords`}>
        {preset.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="brief-excerpt">
        <h3>
          <Trans>Creative direction</Trans>
        </h3>
        <p>{preset.prompt}</p>
      </div>
      <div className="dialog-actions">
        <button
          className="button"
          disabled={!contentState.isValid}
          onClick={() =>
            onCopy(
              JSON.stringify(
                makeStockRequestFromConfiguration({
                  preset,
                  input: contentState.resolvedInput,
                  accent,
                  background,
                }),
                null,
                2,
              ),
              t`Configured JSON copied`,
            )
          }
        >
          <Icon name="copy" size={16} />
          <Trans>Copy configured JSON</Trans>
        </button>
        <button
          className="button button-primary"
          onClick={() =>
            onCopy(
              referenceBrief({ preset, accent, background }),
              t`Creative brief copied`,
            )
          }
        >
          <Icon name="copy" size={16} />
          <Trans>Copy creative brief</Trans>
        </button>
        <button
          className={clsx("button", { "button-saved": saved })}
          onClick={() => onSave(preset.id)}
          aria-pressed={saved}
        >
          <Icon name={saved ? "check" : "bookmark"} size={16} />
          {saved ? t`Saved to references` : t`Save reference`}
        </button>
      </div>
      <div className="detail-links">
        <button
          onClick={() =>
            onCopy(
              `${preset.name} (${preset.id})\n${getReferenceUrlFromPreset(preset)}`,
              t`Reference link copied`,
            )
          }
        >
          <Icon name="copy" size={14} />
          <Trans>Copy link</Trans>
        </button>
        <button
          onClick={download}
          disabled={exporting || !contentState.isValid}
        >
          <Icon name="download" size={14} />
          {exporting ? t`Rendering MP4…` : t`Download MP4`}
        </button>
      </div>
      <p className="dialog-notice" role="status" aria-live="polite">
        {exportStatus ||
          notice ||
          t`Conceptual graphics. No Avandar product footage.`}
      </p>
    </div>
  );
}

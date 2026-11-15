import clsx from "clsx";
import { buildReferenceBrief } from "../buildReferenceBrief";
import { ContentControls } from "../ContentControls/ContentControls";
import { getReferenceUrlFromPreset } from "../getReferenceUrlFromPreset";
import { Icon } from "../Icon";
import { makeStockRequestFromConfiguration } from "../makeStockRequestFromConfiguration";
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
}: Readonly<Props>): ReactNode {
  const { exporting, exportStatus, canExport, download } = usePreviewDownload({
    preset,
    contentState,
  });
  return (
    <div className="dialog-details">
      <p className="dialog-description" id="dialog-description">
        {preset.description}
      </p>
      <ContentControls
        preset={preset.id}
        state={contentState}
        onChange={onContentChange}
      />
      <div className="detail-section">
        <h3>Good for</h3>
        <p>{preset.useWhen}</p>
      </div>
      <div className="keyword-list" aria-label="Keywords">
        {preset.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="brief-excerpt">
        <h3>Creative direction</h3>
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
              "Configured JSON copied",
            )
          }
        >
          <Icon name="copy" size={16} />
          Copy configured JSON
        </button>
        <button
          className="button button-primary"
          onClick={() =>
            onCopy(
              buildReferenceBrief({ preset, accent, background }),
              "Creative brief copied",
            )
          }
        >
          <Icon name="copy" size={16} />
          Copy creative brief
        </button>
        <button
          className={clsx("button", { "button-saved": saved })}
          onClick={() => onSave(preset.id)}
          aria-pressed={saved}
        >
          <Icon name={saved ? "check" : "bookmark"} size={16} />
          {saved ? "Saved to references" : "Save reference"}
        </button>
      </div>
      <div className="detail-links">
        <button
          onClick={() =>
            onCopy(
              `${preset.name} (${preset.id})\n${getReferenceUrlFromPreset(preset)}`,
              "Reference link copied",
            )
          }
        >
          <Icon name="copy" size={14} />
          Copy link
        </button>
        <button
          onClick={download}
          disabled={exporting || !contentState.isValid || !canExport}
        >
          <Icon name="download" size={14} />
          {exporting ? "Rendering MP4…" : "Download MP4"}
        </button>
      </div>
      <p className="dialog-notice" role="status" aria-live="polite">
        {exportStatus ||
          notice ||
          "Conceptual graphics. No Avandar product footage."}
      </p>
    </div>
  );
}

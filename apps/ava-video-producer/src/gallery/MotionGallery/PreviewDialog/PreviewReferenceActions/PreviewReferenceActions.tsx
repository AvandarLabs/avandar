import { clsx } from "clsx";
import { Icon } from "../../Icon";
import { referenceBrief } from "../../referenceBrief";
import { CopyConfiguredMotion } from "../CopyConfiguredMotion/CopyConfiguredMotion";
import css from "./PreviewReferenceActions.module.css";
import type { Props as PreviewProps } from "../PreviewDialogContent/PreviewDialogContent";
import type { ReactNode } from "react";

type Props = Pick<
  PreviewProps,
  | "contentState"
  | "preset"
  | "accent"
  | "background"
  | "onCopy"
  | "saved"
  | "onSave"
>;
/** Copies or saves the selected motion reference from PreviewDetails. */
export function PreviewReferenceActions({
  contentState,
  preset,
  accent,
  background,
  onCopy,
  saved,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.previewReferenceActionsDialogActions}>
      <CopyConfiguredMotion
        {...{ contentState, preset, accent, background, onCopy }}
      />
      <button
        className={css.previewReferenceActionsButtonButtonPrimary}
        onClick={() => {
          return onCopy(
            referenceBrief({ preset, accent, background }),
            "Creative brief copied",
          );
        }}
      >
        <Icon name="copy" size={16} />
        Copy creative brief
      </button>
      <button
        className={clsx("button", { "button-saved": saved })}
        onClick={() => {
          return onSave(preset.id);
        }}
        aria-pressed={saved}
      >
        <Icon name={saved ? "check" : "bookmark"} size={16} />
        {saved ? "Saved to references" : "Save reference"}
      </button>
    </div>
  );
}

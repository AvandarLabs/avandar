import { Trans } from "@lingui/react/macro";
import { useExpandedPreview } from "./useExpandedPreview";
import { CompositionPreviewHeader } from "./CompositionPreviewHeader";
import { CompositionViewer } from "../CompositionViewer/CompositionViewer";
import { usePreviewKeys } from "../../../gallery/MotionGallery/usePreviewKeys";
import css from "./CompositionPreview.module.css";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof CompositionViewer> & {
  onPrevious?: () => void;
  onNext?: () => void;
};

/** Expand the active live player without remounting it or losing its settings. */
export function CompositionPreview({ onPrevious, onNext, ...viewer }: Props) {
  const { expanded, setExpanded, dialog, expandButton } = useExpandedPreview();
  usePreviewKeys({
    enabled: expanded,
    onPrevious,
    onNext,
    onClose: () => setExpanded(false),
    frame: dialog,
  });
  return (
    <div className={css.preview}>
      <button
        className="button"
        ref={expandButton}
        onClick={() => setExpanded(true)}
      >
        <Trans>Expand preview</Trans>
      </button>
      <dialog
        ref={dialog}
        className={css.surface}
        role={expanded ? "dialog" : "region"}
        aria-labelledby="composition-preview-title"
        onCancel={(event) => {
          event.preventDefault();
          setExpanded(false);
        }}
      >
        <CompositionPreviewHeader
          title={viewer.selected.title}
          expanded={expanded}
          onClose={() => setExpanded(false)}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        <CompositionViewer {...viewer} />
      </dialog>
    </div>
  );
}

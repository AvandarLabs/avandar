import { AtlasDialog } from "../../AtlasLayout/AtlasDialog/AtlasDialog";
import {
  PreviewDialogContent,
  type Props as ContentProps,
} from "./PreviewDialogContent";
import type React from "react";

/** Modal controls and motion-specific preview content. */
type Props = ContentProps & {
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

/** Keeps the modal and its focus stable while changing the displayed motion. */
export function PreviewDialog({
  onClose,
  onPrevious,
  onNext,
  ...contentProps
}: Readonly<Props>): React.ReactNode {
  const { preset } = contentProps;
  return (
    <AtlasDialog
      title={preset.name}
      subtitle={preset.category}
      previousLabel="Previous motion"
      nextLabel="Next motion"
      describedBy="dialog-description"
      onClose={onClose}
      onPrevious={onPrevious}
      onNext={onNext}
    >
      <PreviewDialogContent key={preset.id} {...contentProps} />
    </AtlasDialog>
  );
}

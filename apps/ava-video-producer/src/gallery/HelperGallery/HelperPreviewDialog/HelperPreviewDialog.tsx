import { AtlasDialog } from "../../AtlasLayout/AtlasDialog/AtlasDialog";
import { getHelperCategoryLabelFromId } from "../helperCategoryHelpers";
import { HelperDetail } from "../HelperDetail/HelperDetail";
import { HelperPreview } from "../HelperPreview/HelperPreview";
import css from "./HelperPreviewDialog.module.css";
import type { useHelperGallery } from "../useHelperGallery";
import type { ReactNode } from "react";

type Props = {
  gallery: ReturnType<typeof useHelperGallery>;
  open: NonNullable<ReturnType<typeof useHelperGallery>["open"]>;
};
/** Shows a selected helper with its live preview and adjacent navigation. */
export function HelperPreviewDialog({
  gallery,
  open,
}: Readonly<Props>): ReactNode {
  const { previous, next } = gallery;
  return (
    <AtlasDialog
      title={open.title}
      subtitle={getHelperCategoryLabelFromId(open.category)}
      previousLabel="Previous helper"
      nextLabel="Next helper"
      onClose={gallery.close}
      onPrevious={
        previous
          ? () => {
              return gallery.openHelper(previous.id);
            }
          : undefined
      }
      onNext={
        next
          ? () => {
              return gallery.openHelper(next.id);
            }
          : undefined
      }
    >
      <div className={css.helperPreviewDialogModalBody}>
        <HelperPreview helper={open} />
        <HelperDetail helper={open} />
      </div>
    </AtlasDialog>
  );
}

import { AtlasDialog } from "../../../gallery/AtlasLayout/AtlasDialog/AtlasDialog";
import { categoryLabel } from "../categoryLabel";
import { CompositionViewer } from "../CompositionViewer/CompositionViewer";
import type { useCompositionGallery } from "../useCompositionGallery";
import type { ReactNode } from "react";

type Props = { gallery: ReturnType<typeof useCompositionGallery> };
/** Display the active live preview and its neighboring catalog entries. */
export function CompositionDialog({ gallery }: Readonly<Props>): ReactNode {
  const { open, previous, next, selection } = gallery;
  return (
    <>
      {open ? (
        <AtlasDialog
          title={open.title}
          subtitle={categoryLabel(open.category)}
          previousLabel="Previous preview"
          nextLabel="Next preview"
          onClose={gallery.close}
          onPrevious={
            previous
              ? () => {
                  return gallery.openEntry(previous.id);
                }
              : undefined
          }
          onNext={
            next
              ? () => {
                  return gallery.openEntry(next.id);
                }
              : undefined
          }
        >
          <CompositionViewer
            selected={open}
            captions={selection.captions}
            onOptions={gallery.receiveOptions}
          />
        </AtlasDialog>
      ) : null}
    </>
  );
}

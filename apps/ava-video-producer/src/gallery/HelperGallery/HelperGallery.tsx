import { Trans } from "@lingui/react/macro";
import { AtlasSections } from "../MotionGallery/AtlasSections";
import { GalleryHeader } from "../MotionGallery/GalleryHeader";
import { HelperDetail } from "./HelperDetail/HelperDetail";
import css from "./HelperGallery.module.css";
import { HelperPreview } from "./HelperPreview/HelperPreview";
import { HelperSidebar } from "./HelperSidebar/HelperSidebar";
import { useHelperGallery } from "./useHelperGallery";

/**
 * The Helpers section of the Motion Atlas: the shared motion helpers scenes
 * are built from, browsable by category and previewed live in isolation.
 */
export function HelperGallery() {
  const gallery = useHelperGallery();
  const { previous, next } = gallery;
  return (
    <>
      <GalleryHeader />
      <AtlasSections section="helpers" />
      <main className={css.helperGallery}>
        <h1>
          <Trans>Helpers</Trans>
        </h1>
        <p className={css.description}>
          <Trans>
            The shared motion helpers scenes are built from, each previewed live
            with the real code.
          </Trans>
        </p>
        <div className={css.workspace}>
          <HelperSidebar
            entries={gallery.entries}
            selection={gallery.selection}
            onSelect={gallery.select}
            onCategoryChange={gallery.chooseCategory}
            onQueryChange={gallery.setQuery}
          />
          <div className={css.content}>
            <HelperPreview
              helper={gallery.selected}
              onPrevious={
                previous ? () => gallery.select(previous.id) : undefined
              }
              onNext={next ? () => gallery.select(next.id) : undefined}
            />
            <HelperDetail helper={gallery.selected} />
          </div>
        </div>
      </main>
    </>
  );
}

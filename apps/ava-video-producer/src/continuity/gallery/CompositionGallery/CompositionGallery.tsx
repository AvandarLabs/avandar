import { Trans } from "@lingui/react/macro";
import { AtlasSections } from "../../../gallery/MotionGallery/AtlasSections";
import { GalleryHeader } from "../../../gallery/MotionGallery/GalleryHeader";
import { CompositionSidebar } from "../CompositionSidebar/CompositionSidebar";
import { CompositionPreview } from "../CompositionPreview/CompositionPreview";
import { useCompositionGallery } from "../useCompositionGallery";
import css from "./CompositionGallery.module.css";

/** Compositions and sample films inside the shared Motion Atlas shell. */
export function CompositionGallery() {
  const gallery = useCompositionGallery();
  const selectedIndex = gallery.entries.findIndex(
    (entry) => entry.id === gallery.selected.id,
  );
  const previous = gallery.entries[selectedIndex - 1];
  const following =
    selectedIndex < 0 ? undefined : gallery.entries[selectedIndex + 1];
  return (
    <>
      <GalleryHeader />
      <AtlasSections
        section={
          gallery.selection.family === "films" ? "films" : "compositions"
        }
      />
      <main className={css.compositionGallery}>
        <h1>
          {gallery.selection.family === "films" ? (
            <Trans>Sample films</Trans>
          ) : (
            <Trans>Compositions</Trans>
          )}
        </h1>
        <p className={css.description}>
          {gallery.selection.family === "films" ? (
            <Trans>Complete films built from the motion library.</Trans>
          ) : (
            <Trans>Reusable units that combine two or more motions.</Trans>
          )}
        </p>
        <div className={css.compositionGalleryWorkspace}>
          <CompositionSidebar
            entries={gallery.entries}
            selection={gallery.selection}
            onFamilyChange={gallery.chooseFamily}
            onSelect={gallery.select}
            onQueryChange={gallery.setQuery}
          />
          <CompositionPreview
            selected={gallery.selected}
            captions={gallery.selection.captions}
            onOptions={gallery.receiveOptions}
            onPrevious={
              previous ? () => gallery.select(previous.id) : undefined
            }
            onNext={following ? () => gallery.select(following.id) : undefined}
          />
        </div>
      </main>
    </>
  );
}

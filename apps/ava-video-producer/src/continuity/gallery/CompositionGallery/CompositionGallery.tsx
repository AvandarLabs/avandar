import { AtlasCategoryNav } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { AtlasCollection } from "../../../gallery/AtlasLayout/AtlasCollection/AtlasCollection";
import { AtlasDialog } from "../../../gallery/AtlasLayout/AtlasDialog/AtlasDialog";
import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/useGalleryVideoTheme";
import { AtlasSections } from "../../../gallery/MotionGallery/AtlasSections";
import { GalleryHeader } from "../../../gallery/MotionGallery/GalleryHeader";
import { categoryLabel } from "../categoryLabel";
import { CompositionCard } from "../CompositionCard/CompositionCard";
import { CompositionViewer } from "../CompositionViewer/CompositionViewer";
import { countCompositionCategories } from "../gallerySelectionReducer/gallerySelectionReducer";
import { useCompositionGallery } from "../useCompositionGallery";
import type { ReactNode } from "react";

type Props = {
  section: "compositions" | "films";
};

/** Section copy, so one gallery serves both Compositions and Sample films. */
function _sectionCopy(section: Props["section"]) {
  return section === "films"
    ? {
        eyebrow: "SAMPLE FILMS",
        title: (
          <>
            Stories, <em>start to finish.</em>
          </>
        ),
        description:
          "Complete films built from the motion library. Each one sequences several compositions into a single argument.",
        all: "All films",
        navigation: "Film categories",
        search: "Search films",
        empty: "No matching films.",
      }
    : {
        eyebrow: "THE COMPOSITION COLLECTION",
        title: (
          <>
            Motions, <em>combined.</em>
          </>
        ),
        description:
          "Reusable compositions: transitions, compositing and recipes that sequence or layer two or more motions.",
        all: "All compositions",
        navigation: "Composition categories",
        search: "Search compositions",
        empty: "No matching compositions.",
      };
}

/**
 * The Compositions and Sample films sections: a category sidebar, a poster
 * card per entry, and the live player in the shared preview modal.
 */
export function CompositionGallery({ section }: Props): ReactNode {
  const copy = _sectionCopy(section);
  const { themeId } = useGalleryVideoTheme();
  const gallery = useCompositionGallery(
    section === "films" ? "films" : "vocabulary",
  );
  const { selection, open, previous, next } = gallery;
  const categories = countCompositionCategories(selection.family).map(
    (category) => {
      return { ...category, label: categoryLabel(category.id) };
    },
  );
  return (
    <>
      <a className="skip-link" href="#library">
        Skip to the collection
      </a>
      <GalleryHeader />
      <AtlasSections section={section} />
      <div className="workspace">
        <AtlasCategoryNav
          label={copy.navigation}
          eyebrow="BROWSE THE COLLECTION"
          allLabel={copy.all}
          total={categories.reduce((total, item) => {
            return total + item.count;
          }, 0)}
          categories={categories}
          selected={selection.category}
          onSelect={gallery.chooseCategory}
        />
        <AtlasCollection
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          heading={
            categories.find((item) => {
              return item.id === selection.category;
            })?.label ?? copy.all
          }
          resultCount={gallery.entries.length}
          query={selection.query}
          onQueryChange={gallery.setQuery}
          searchLabel={copy.search}
          searchPlaceholder="Search titles, ideas, tags…"
          emptyTitle={copy.empty}
          onReset={() => {
            gallery.setQuery("");
            gallery.chooseCategory("all");
          }}
          resetLabel={copy.all}
        >
          {gallery.entries.map((entry) => {
            return (
              <CompositionCard
                key={entry.id}
                entry={entry}
                category={categoryLabel(entry.category)}
                themeId={themeId}
                onOpen={gallery.openEntry}
              />
            );
          })}
        </AtlasCollection>
      </div>
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

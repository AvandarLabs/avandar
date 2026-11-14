import { Trans, useLingui } from "@lingui/react/macro";
import { AtlasCategoryNav } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { AtlasCollection } from "../../../gallery/AtlasLayout/AtlasCollection/AtlasCollection";
import { AtlasDialog } from "../../../gallery/AtlasLayout/AtlasDialog/AtlasDialog";
import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/GalleryVideoTheme";
import { AtlasSections } from "../../../gallery/MotionGallery/AtlasSections";
import { GalleryHeader } from "../../../gallery/MotionGallery/GalleryHeader";
import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionCard } from "../CompositionCard/CompositionCard";
import { CompositionViewer } from "../CompositionViewer/CompositionViewer";
import { countCompositionCategories } from "../gallerySelectionReducer/gallerySelectionReducer";
import { useCategoryLabel } from "../useCategoryLabel/useCategoryLabel";
import { useCompositionGallery } from "../useCompositionGallery";

type Props = {
  section: "compositions" | "films";
};

/** Section copy, so one gallery serves both Compositions and Sample films. */
function useSectionCopy(section: Props["section"]) {
  const { t } = useLingui();
  return section === "films"
    ? {
        eyebrow: t`SAMPLE FILMS`,
        title: (
          <Trans>
            Stories, <em>start to finish.</em>
          </Trans>
        ),
        description: t`Complete films built from the motion library. Each one sequences several compositions into a single argument.`,
        all: t`All films`,
        navigation: t`Film categories`,
        search: t`Search films`,
        empty: t`No matching films.`,
      }
    : {
        eyebrow: t`THE COMPOSITION COLLECTION`,
        title: (
          <Trans>
            Motions, <em>combined.</em>
          </Trans>
        ),
        description: t`Reusable compositions: transitions, compositing and recipes that sequence or layer two or more motions.`,
        all: t`All compositions`,
        navigation: t`Composition categories`,
        search: t`Search compositions`,
        empty: t`No matching compositions.`,
      };
}

/**
 * The Compositions and Sample films sections: a category sidebar, a poster
 * card per entry, and the live player in the shared preview modal.
 */
export function CompositionGallery({ section }: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const getCategoryLabel = useCategoryLabel();
  const copy = useSectionCopy(section);
  const { themeId } = useGalleryVideoTheme();
  const gallery = useCompositionGallery(
    section === "films" ? "films" : "vocabulary",
  );
  const { selection, open, previous, next } = gallery;
  const categories = countCompositionCategories(selection.family).map(
    (category) => ({ ...category, label: getCategoryLabel(category.id) }),
  );
  return (
    <>
      <a className="skip-link" href="#library">
        <Trans>Skip to the collection</Trans>
      </a>
      <GalleryHeader />
      <AtlasSections section={section} />
      <div className="workspace">
        <AtlasCategoryNav
          label={copy.navigation}
          eyebrow={t`BROWSE THE COLLECTION`}
          allLabel={copy.all}
          total={categories.reduce((total, item) => total + item.count, 0)}
          categories={categories}
          selected={selection.category}
          onSelect={gallery.chooseCategory}
        />
        <AtlasCollection
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          heading={
            categories.find((item) => item.id === selection.category)?.label ??
            copy.all
          }
          resultCount={gallery.entries.length}
          query={selection.query}
          onQueryChange={gallery.setQuery}
          searchLabel={copy.search}
          searchPlaceholder={t`Search titles, ideas, tags…`}
          emptyTitle={copy.empty}
          onReset={() => {
            gallery.setQuery("");
            gallery.chooseCategory("all");
          }}
          resetLabel={copy.all}
        >
          {gallery.entries.map((entry) => (
            <CompositionCard
              key={entry.id}
              entry={entry}
              category={getCategoryLabel(entry.category)}
              themeId={themeId}
              onOpen={gallery.openEntry}
            />
          ))}
        </AtlasCollection>
      </div>
      {open ? (
        <AtlasDialog
          title={translate(open.title)}
          subtitle={getCategoryLabel(open.category)}
          previousLabel={t`Previous preview`}
          nextLabel={t`Next preview`}
          onClose={gallery.close}
          onPrevious={
            previous ? () => gallery.openEntry(previous.id) : undefined
          }
          onNext={next ? () => gallery.openEntry(next.id) : undefined}
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

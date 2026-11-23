import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/useGalleryVideoTheme";
import { AtlasSections } from "../../../gallery/MotionGallery/AtlasSections/AtlasSections";
import { GalleryHeader } from "../../../gallery/MotionGallery/GalleryHeader";
import { categoryLabel } from "../categoryLabel";
import { CompositionSelection } from "../CompositionSelection/CompositionSelection";
import { useCompositionGallery } from "../useCompositionGallery";
import { CompositionDialog } from "./CompositionDialog";
import { CompositionWorkspace } from "./CompositionWorkspace";
import { getCompositionSectionContentFromSection } from "./getCompositionSectionContentFromSection";
import type { ReactNode } from "react";

type Props = { section: "compositions" | "films" };

/**
 * The Compositions and Sample films sections: a category sidebar, a poster
 * card per entry, and the live player in the shared preview modal.
 */
export function CompositionGallery({ section }: Readonly<Props>): ReactNode {
  const copy = getCompositionSectionContentFromSection({ section });
  const { themeId } = useGalleryVideoTheme();
  const gallery = useCompositionGallery(
    section === "films" ? "films" : "vocabulary",
  );
  const { selection } = gallery;
  const categories = CompositionSelection.countCompositionCategories(
    selection.family,
  ).map((category) => {
    return { ...category, label: categoryLabel(category.id) };
  });
  return (
    <>
      <a className="skip-link" href="#library">
        Skip to the collection
      </a>
      <GalleryHeader />
      <AtlasSections section={section} />
      <CompositionWorkspace
        gallery={gallery}
        copy={copy}
        categories={categories}
        themeId={themeId}
      />
      <CompositionDialog gallery={gallery} />
    </>
  );
}

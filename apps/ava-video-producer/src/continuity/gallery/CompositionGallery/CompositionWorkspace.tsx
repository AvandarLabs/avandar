import { AtlasCategoryNav } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { CompositionCollection } from "./CompositionCollection";
import type { CompositionSelection } from "../CompositionSelection/CompositionSelection";
import type { useCompositionGallery } from "../useCompositionGallery";
import type { getCompositionSectionContentFromSection } from "./getCompositionSectionContentFromSection";
import type { ReactNode } from "react";

type Props = {
  gallery: ReturnType<typeof useCompositionGallery>;
  copy: ReturnType<typeof getCompositionSectionContentFromSection>;
  categories: Array<
    ReturnType<
      typeof CompositionSelection.countCompositionCategories
    >[number] & { label: string }
  >;
  themeId: string;
};
/** Couple category navigation with the collection selected by the gallery. */
export function CompositionWorkspace({
  gallery,
  copy,
  categories,
  themeId,
}: Readonly<Props>): ReactNode {
  const { selection } = gallery;
  return (
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
      <CompositionCollection
        gallery={gallery}
        copy={copy}
        categories={categories}
        themeId={themeId}
      />
    </div>
  );
}

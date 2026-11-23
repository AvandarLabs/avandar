import { propEq } from "@avandar/utils";
import { AtlasCollection } from "../../../gallery/AtlasLayout/AtlasCollection/AtlasCollection";
import { categoryLabel } from "../categoryLabel";
import { CompositionCard } from "../CompositionCard/CompositionCard";
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
/**
 * Show filtered composition cards and the shared collection search controls.
 */
export function CompositionCollection({
  gallery,
  copy,
  categories,
  themeId,
}: Readonly<Props>): ReactNode {
  const { selection } = gallery;
  return (
    <AtlasCollection
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      heading={
        categories.find(propEq("id", selection.category))?.label ?? copy.all
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
  );
}

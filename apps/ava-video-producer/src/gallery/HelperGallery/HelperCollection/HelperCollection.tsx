import { AtlasCollection } from "../../AtlasLayout/AtlasCollection/AtlasCollection";
import { HELPER_CATEGORIES } from "../helperCategoryHelpers";
import { HelperPlaybackToggle } from "../HelperPlaybackToggle/HelperPlaybackToggle";
import { HelperResultCard } from "./HelperResultCard/HelperResultCard";
import type { useHelperGallery } from "../useHelperGallery";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Props = {
  gallery: ReturnType<typeof useHelperGallery>;
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/** Presents helper search, playback, and the matching live preview cards. */
export function HelperCollection({
  gallery,
  playing,
  setPlaying,
}: Readonly<Props>): ReactNode {
  const { selection, open } = gallery;
  return (
    <AtlasCollection
      eyebrow="THE HELPER LIBRARY"
      title={
        <>
          The code <em>behind the motion.</em>
        </>
      }
      description={
        "The shared helpers every motion and composition is built from, each previewed live with the real code."
      }
      heading={_getCollectionHeading(selection.category)}
      resultCount={gallery.entries.length}
      query={selection.query}
      onQueryChange={gallery.setQuery}
      searchLabel="Search helpers"
      searchPlaceholder="Search helpers or exports…"
      tools={<HelperPlaybackToggle {...{ playing, setPlaying }} />}
      emptyTitle="No matching helpers."
      onReset={() => {
        gallery.setQuery("");
        gallery.chooseCategory("all");
      }}
      resetLabel="All helpers"
    >
      {gallery.entries.map((helper) => {
        return (
          <HelperResultCard
            key={helper.id}
            {...{ helper, playing, open, gallery }}
          />
        );
      })}
    </AtlasCollection>
  );
}

function _getCollectionHeading(category: string): string {
  return (
    HELPER_CATEGORIES.find((item) => {
      return item.id === category;
    })?.label ?? "All helpers"
  );
}

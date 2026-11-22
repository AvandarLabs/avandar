import { AtlasCategoryNav } from "../../AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { HELPER_CATEGORIES } from "../helperCategoryHelpers";
import { HelperCollection } from "../HelperCollection/HelperCollection";
import { HELPER_CATALOG } from "../HelperFilmIds";
import type { useHelperGallery } from "../useHelperGallery";
import css from "./HelperWorkspace.module.css";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  gallery: ReturnType<typeof useHelperGallery>;
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/** Lays out the helper catalog navigation alongside its searchable grid. */
export function HelperWorkspace({
  gallery,
  playing,
  setPlaying,
}: Readonly<Props>): ReactNode {
  const { selection } = gallery;
  return (
    <div className={css.helperWorkspaceWorkspace}>
      <AtlasCategoryNav
        label="Helper categories"
        eyebrow="BROWSE THE LIBRARY"
        allLabel="All helpers"
        total={HELPER_CATALOG.helpers.length}
        categories={HELPER_CATEGORIES}
        selected={selection.category}
        onSelect={gallery.chooseCategory}
      />
      <HelperCollection {...{ gallery, playing, setPlaying }} />
    </div>
  );
}

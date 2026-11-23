import { GalleryIntroduction } from "../GalleryIntroduction";
import { GalleryNavigation } from "../GalleryNavigation/GalleryNavigation";
import { MotionCollection } from "../MotionCollection/MotionCollection";
import { MotionLibraryFooter } from "../MotionLibraryFooter/MotionLibraryFooter";
import css from "./MotionWorkspace.module.css";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState.types";
import type { ReactNode } from "react";

type Props = {
  state: Readonly<MotionGalleryState>;
  savedIds: ReadonlySet<string>;
};
/** Lays out the MotionLibrary category navigation and browsing content. */
export function MotionWorkspace({
  state,
  savedIds,
}: Readonly<Props>): ReactNode {
  const { category, selectCategory, saved } = state;
  return (
    <div className={css.motionWorkspaceWorkspace}>
      <GalleryNavigation
        category={category}
        selectCategory={selectCategory}
        saved={saved}
      />
      <main
        className={css.motionWorkspaceLibraryMain}
        id="library"
        tabIndex={-1}
      >
        <GalleryIntroduction />
        <MotionCollection {...{ state, savedIds }} />
        <MotionLibraryFooter />
      </main>
    </div>
  );
}

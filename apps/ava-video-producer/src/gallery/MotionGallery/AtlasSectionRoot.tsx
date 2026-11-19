import { CompositionGallery } from "../../continuity/gallery/CompositionGallery/CompositionGallery";
import { GalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import { HelperGallery } from "../HelperGallery/HelperGallery";
import { getAtlasSection } from "./getAtlasSection";
import { MotionLibrary } from "./MotionLibrary";
import type { ReactNode } from "react";

/**
 * The gallery for the section the URL names; themed sections share one draft.
 */
export function AtlasSectionRoot(): ReactNode {
  const section = getAtlasSection();
  if (section === "helpers") {
    return <HelperGallery />;
  }
  return (
    <GalleryVideoTheme>
      {section === "motions" ? (
        <MotionLibrary />
      ) : (
        <CompositionGallery section={section} />
      )}
    </GalleryVideoTheme>
  );
}

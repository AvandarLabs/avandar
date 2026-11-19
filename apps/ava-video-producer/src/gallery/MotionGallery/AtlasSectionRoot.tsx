import { CompositionGallery } from "../../continuity/gallery/CompositionGallery/CompositionGallery";
import { GalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import { HelperGallery } from "../HelperGallery/HelperGallery";
import { getAtlasSection } from "./getAtlasSection";
import { MotionLibrary } from "./MotionLibrary";
import type { ReactNode } from "react";

/** The gallery for the section the URL names. */
function AtlasSection(): ReactNode {
  const section = getAtlasSection();
  if (section === "helpers") {
    return <HelperGallery />;
  }
  return section === "motions" ? (
    <MotionLibrary />
  ) : (
    <CompositionGallery section={section} />
  );
}

/**
 * The gallery for the section the URL names. Every section, helpers
 * included, shares one theme draft, so each preview follows the active
 * theme.
 */
export function AtlasSectionRoot(): ReactNode {
  return (
    <GalleryVideoTheme>
      <AtlasSection />
    </GalleryVideoTheme>
  );
}

import { CompositionGallery } from "../../../continuity/gallery/CompositionGallery/CompositionGallery";
import { GalleryVideoTheme } from "../../GalleryVideoTheme/GalleryVideoTheme";
import { HelperGallery } from "../../HelperGallery/HelperGallery";
import { getAtlasSection } from "../getAtlasSection";
import { MotionLibrary } from "../MotionLibrary/MotionLibrary";
import { AtlasSection } from "./AtlasSection";
import type { ReactNode } from "react";
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

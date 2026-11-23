import { CompositionGallery } from "../../../continuity/gallery/CompositionGallery/CompositionGallery";
import { HelperGallery } from "../../HelperGallery/HelperGallery";
import { getAtlasSection } from "../getAtlasSection";
import { MotionLibrary } from "../MotionLibrary/MotionLibrary";
import type { ReactNode } from "react";
/** The gallery for the section the URL names. */
export function AtlasSection(): ReactNode {
  const section = getAtlasSection();
  return section === "helpers" ? (
    <HelperGallery />
  ) : section === "motions" ? (
    <MotionLibrary />
  ) : (
    <CompositionGallery section={section} />
  );
}

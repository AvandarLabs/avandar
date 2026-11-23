import { useState } from "react";
import { AtlasSections } from "../MotionGallery/AtlasSections/AtlasSections";
import { GalleryHeader } from "../MotionGallery/GalleryHeader";
import { isReducedMotionPreferred } from "../MotionGallery/isReducedMotionPreferred";
import css from "./HelperGallery.module.css";
import { HelperPreviewDialog } from "./HelperPreviewDialog/HelperPreviewDialog";
import { HelperWorkspace } from "./HelperWorkspace/HelperWorkspace";
import { useHelperGallery } from "./useHelperGallery";
import type { ReactNode } from "react";

/**
 * The Helpers section of the Motion Atlas: the shared helpers motions and
 * compositions are built from, as live thumbnail cards by category, each
 * opening its live preview and reference in the shared modal.
 */
export function HelperGallery(): ReactNode {
  const gallery = useHelperGallery();
  const [playing, setPlaying] = useState(() => {
    return !isReducedMotionPreferred();
  });
  const { selection, open, previous, next } = gallery;
  return (
    <>
      <a className={css.helperGallerySkipLink} href="#library">
        Skip to the helpers
      </a>
      <GalleryHeader />
      <AtlasSections section="helpers" />
      <HelperWorkspace {...{ gallery, playing, setPlaying }} />
      {open ? <HelperPreviewDialog {...{ gallery, open }} /> : null}
    </>
  );
}

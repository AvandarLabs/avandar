import css from "./GalleryNavigationNote.module.css";
import type { ReactNode } from "react";

/** Shows the reference-use guidance in GalleryNavigation. */
export function GalleryNavigationNote(): ReactNode {
  return (
    <div className={css.galleryNavigationNoteSidebarNote}>
      <span className={css.galleryNavigationNoteNoteSymbol} aria-hidden="true">
        ✳
      </span>
      <h2>
        Find the movement.
        <br />
        Shape the story.
      </h2>
      <p>
        Save a few references, then copy a creative brief for your next film.
      </p>
      <div className={css.galleryNavigationNoteNoteRule} />
      <span>
        CONCEPTUAL GRAPHICS
        <br />
        NOT PRODUCT FOOTAGE
      </span>
    </div>
  );
}

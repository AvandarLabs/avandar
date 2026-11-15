import { useContinuityCopy } from "../../useContinuityCopy";
import css from "./GalleryHeader.module.css";

/** Collection identity and navigation to the other live showcase libraries. */
export function GalleryHeader() {
  const translate = useContinuityCopy();
  return (
    <header className={css.galleryHeader}>
      <nav
        className={css.galleryHeaderNavigation}
        aria-label={translate("Showcase navigation")}
      >
        <a className={css.galleryHeaderBrand} href="/">
          {translate("AVANDAR")}
        </a>
        <div className={css.galleryHeaderLinks}>
          <a href="/motion.html">{translate("Motion Atlas")}</a>
          <a href="/productions.html">{translate("Productions")}</a>
        </div>
      </nav>
      <div className={css.galleryHeaderIntroduction}>
        <h1>{translate("Composition Atlas")}</h1>
        <p>
          {translate(
            "Ten stories about how Avandar works, and reusable guidance for the transitions and visual relationships that make them flow.",
          )}
        </p>
      </div>
    </header>
  );
}

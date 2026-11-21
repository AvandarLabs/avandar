import { clsx } from "clsx";
import { STOCK_CATALOG, type StockPresetId } from "../../../stock/stockEntry";
import { GalleryCategoryChoices } from "../GalleryCategoryChoices/GalleryCategoryChoices";
import { GalleryNavigationNote } from "../GalleryNavigationNote/GalleryNavigationNote";
import { GallerySavedChoice } from "../GallerySavedChoice/GallerySavedChoice";
import { Icon } from "../Icon";
import css from "./GalleryNavigation.module.css";
import type { ReactNode } from "react";

type Props = {
  category: string;
  selectCategory: (value: string) => void;
  saved: StockPresetId[];
};
/** Motion families and saved-reference navigation. */
export function GalleryNavigation({
  category,
  selectCategory,
  saved,
}: Readonly<Props>): ReactNode {
  return (
    <aside
      className={css.galleryNavigationSidebar}
      aria-label="Library navigation"
    >
      <div className={css.galleryNavigationSidebarTop}>
        <p className={css.galleryNavigationEyebrow}>BROWSE THE COLLECTION</p>
        <button
          className={clsx(
            css.galleryNavigationCategoryButton,
            category === "All motions" ? "active" : "",
          )}
          onClick={() => {
            return selectCategory("All motions");
          }}
          aria-pressed={category === "All motions"}
        >
          <Icon name="grid" />
          <span>All motions</span>
          <span className={css.galleryNavigationCategoryCount}>
            {STOCK_CATALOG.length}
          </span>
        </button>
        <GalleryCategoryChoices {...{ category, selectCategory }} />
        <GallerySavedChoice {...{ category, selectCategory, saved }} />
      </div>
      <GalleryNavigationNote />
      <div className={css.galleryNavigationSidebarBottom}>
        <span className={css.galleryNavigationTinyDot} />
        LOCAL MOTION LIBRARY
        <span>01</span>
      </div>
    </aside>
  );
}

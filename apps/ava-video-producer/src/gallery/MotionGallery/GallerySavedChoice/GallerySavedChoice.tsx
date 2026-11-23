import { clsx } from "clsx";
import { type StockPresetId } from "../../../stock/stockEntry";
import { Icon } from "../Icon";
import css from "./GallerySavedChoice.module.css";
import type { ReactNode } from "react";

type Props = {
  category: string;
  selectCategory: (value: string) => void;
  saved: StockPresetId[];
};
/** Selects the saved-reference collection from GalleryNavigation. */
export function GallerySavedChoice({
  category,
  selectCategory,
  saved,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.gallerySavedChoiceSavedNav}>
      <button
        className={clsx(
          css.gallerySavedChoiceCategoryButton,
          category === "Saved references" ? "active" : "",
        )}
        onClick={() => {
          return selectCategory("Saved references");
        }}
        aria-pressed={category === "Saved references"}
      >
        <Icon name="bookmark" />
        <span>Saved references</span>
        <span className={css.gallerySavedChoiceCategoryCount}>
          {saved.length}
        </span>
      </button>
    </div>
  );
}

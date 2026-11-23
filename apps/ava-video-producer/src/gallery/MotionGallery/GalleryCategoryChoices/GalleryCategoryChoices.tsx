import { propEq } from "@avandar/utils";
import { clsx } from "clsx";
import { STOCK_CATALOG, STOCK_CATEGORIES } from "../../../stock/stockEntry";
import { Icon, type IconName } from "../Icon";
import css from "./GalleryCategoryChoices.module.css";
import type { ReactNode } from "react";

const CATEGORY_ICONS: Record<string, IconName> = {
  Networks: "network",
  "Data flow": "flow",
  Code: "code",
  Charts: "chart",
  Interface: "interface",
};
type Props = { category: string; selectCategory: (value: string) => void };
/** Lists preset categories for GalleryNavigation in catalog order. */
export function GalleryCategoryChoices({
  category,
  selectCategory,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.galleryCategoryChoicesCategoryList}>
      {STOCK_CATEGORIES.map((name) => {
        return (
          <button
            key={name}
            className={clsx(
              css.galleryCategoryChoicesCategoryButton,
              category === name ? "active" : "",
            )}
            onClick={() => {
              return selectCategory(name);
            }}
            aria-pressed={category === name}
          >
            <Icon name={CATEGORY_ICONS[name] ?? "grid"} />
            <span>{name}</span>
            <span className={css.galleryCategoryChoicesCategoryCount}>
              {STOCK_CATALOG.filter(propEq("category", name)).length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

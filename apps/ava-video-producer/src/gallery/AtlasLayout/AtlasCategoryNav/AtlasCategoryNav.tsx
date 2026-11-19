import { Icon, type IconName } from "../../MotionGallery/Icon";
import type { ReactNode } from "react";

/** One sidebar filter: a category id, its display label and item count. */
export type AtlasCategory = {
  id: string;
  label: string;
  count: number;
  icon?: IconName;
};

/** The filter value that shows every item in a section. */
export const ALL_ATLAS_CATEGORIES = "all";

type Props = {
  /** Accessible name of the sidebar, for example "Composition categories". */
  label: string;
  eyebrow: string;
  /** Label of the unfiltered option, for example "All compositions". */
  allLabel: string;
  total: number;
  categories: readonly AtlasCategory[];
  selected: string;
  onSelect: (category: string) => void;
  /** Optional closing note under the list, as the Motions sidebar has. */
  children?: ReactNode;
};

/**
 * The Motion Atlas sidebar: an "all" option and one button per category,
 * each with its item count, shared by every section.
 */
export function AtlasCategoryNav({
  label,
  eyebrow,
  allLabel,
  total,
  categories,
  selected,
  onSelect,
  children,
}: Props) {
  return (
    <aside className="sidebar" aria-label={label}>
      <div className="sidebar-top">
        <p className="eyebrow">{eyebrow}</p>
        <CategoryButton
          icon="grid"
          label={allLabel}
          count={total}
          isActive={selected === ALL_ATLAS_CATEGORIES}
          onClick={() => {
            return onSelect(ALL_ATLAS_CATEGORIES);
          }}
        />
        <div className="category-list">
          {categories.map((category) => {
            return (
              <CategoryButton
                key={category.id}
                icon={category.icon ?? "grid"}
                label={category.label}
                count={category.count}
                isActive={selected === category.id}
                onClick={() => {
                  return onSelect(category.id);
                }}
              />
            );
          })}
        </div>
      </div>
      {children}
    </aside>
  );
}

function CategoryButton({
  icon,
  label,
  count,
  isActive,
  onClick,
}: {
  icon: IconName;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`category-button ${isActive ? "active" : ""}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <Icon name={icon} />
      <span>{label}</span>
      <span className="category-count">{count}</span>
    </button>
  );
}

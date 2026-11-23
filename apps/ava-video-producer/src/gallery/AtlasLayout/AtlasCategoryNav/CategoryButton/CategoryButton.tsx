import { Icon, type IconName } from "../../../MotionGallery/Icon";
import type { ReactNode } from "react";

type CategoryButtonOptions = {
  icon: IconName;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
};

/** Renders CategoryButton with the authored gallery behavior. */
export function CategoryButton({
  icon,
  label,
  count,
  isActive,
  onClick,
}: Readonly<CategoryButtonOptions>): ReactNode {
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

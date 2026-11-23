import { Icon } from "../../../MotionGallery/Icon";
import css from "./AtlasCollectionEmptyState.module.css";
import type { ReactNode } from "react";

type Props = { emptyTitle: string; onReset: () => void; resetLabel: string };
/** Offers the shared Atlas collection reset action when no cards match. */
export function AtlasCollectionEmptyState({
  emptyTitle,
  onReset,
  resetLabel,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.atlasCollectionEmptyStateEmptyState}>
      <Icon name="search" size={30} />
      <h3>{emptyTitle}</h3>
      <p>Try a different keyword, or explore the full collection.</p>
      <button
        type="button"
        className={css.atlasCollectionEmptyStateButton}
        onClick={onReset}
      >
        {resetLabel}
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

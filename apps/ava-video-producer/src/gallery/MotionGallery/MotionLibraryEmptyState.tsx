import { Icon } from "./Icon";
import type { ReactNode } from "react";

type Props = {
  category: string;
  query: string;
  selectCategory: (category: string) => void;
};

/** Empty search and empty saved-reference states keep their own guidance. */
export function MotionLibraryEmptyState({
  category,
  query,
  selectCategory,
}: Readonly<Props>): ReactNode {
  return (
    <div className="empty-state">
      <Icon
        name={category === "Saved references" && !query ? "bookmark" : "search"}
        size={30}
      />
      <h3>
        {category === "Saved references" && !query
          ? "Keep a little inspiration."
          : "No matching motions."}
      </h3>
      <p>
        {category === "Saved references" && !query
          ? "Use the bookmark on any preset to add it to your references."
          : "Try a different keyword, or explore the full collection."}
      </p>
      <button
        className="button"
        onClick={() => {
          return selectCategory("All motions");
        }}
      >
        Explore all motions
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

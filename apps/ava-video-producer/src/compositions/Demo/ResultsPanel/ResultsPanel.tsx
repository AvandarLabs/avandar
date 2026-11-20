import { EmptyState } from "./EmptyState";
import { Results } from "./Results";
import type { ReactNode } from "react";
/**
 * The results phase: an empty state that dissolves into the channel
 * breakdown once the query runs, then dims the rows the active filter
 * excludes.
 */
export function ResultsPanel({
  frame,
  totalShown,
}: {
  frame: number;
  totalShown: number;
}): ReactNode {
  return (
    <>
      <EmptyState frame={frame} />
      <Results frame={frame} totalShown={totalShown} />
    </>
  );
}

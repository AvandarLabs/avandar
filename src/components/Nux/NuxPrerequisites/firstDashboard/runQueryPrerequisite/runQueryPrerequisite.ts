import type { NuxPrerequisite } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

/**
 * Live-signal-only prerequisite for the run_query milestone.
 *
 * Matches user-asked queries that returned rows. Never satisfied from workspace
 * artifacts.
 */
export const runQueryPrerequisite: NuxPrerequisite = {
  milestoneKey: "run_query",
  completionEvent: "query.succeeded",
  matchesEvent: (event) => {
    if (event.name !== "query.succeeded") {
      return false;
    }

    const { trigger, rowCount } = event.payload;

    return (
      (trigger === "sql_submit" ||
        trigger === "structured_change" ||
        trigger === "chat_generated") &&
      rowCount > 0
    );
  },
  isSatisfied: () => {
    return false;
  },
};

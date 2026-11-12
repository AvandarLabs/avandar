import { useLocation, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";

/**
 * Whether the Data Sources list shows beside the current view. A task view
 * (the create flow) hides it by default to free width for its tables, and
 * Show list brings it back until the route changes. Every other view always
 * shows it. Used by `DataManagerApp` and its toolbar.
 */
export function useListPaneToggle(): {
  isTaskView: boolean;
  isListShown: boolean;
  onToggleList: () => void;
} {
  const matchRoute = useMatchRoute();
  const pathname = useLocation({
    select: (location) => {
      return location.pathname;
    },
  });
  const [shownOnPathname, setShownOnPathname] = useState<string | undefined>();
  const isTaskView = Boolean(
    matchRoute({ to: "/$workspaceSlug/data-manager/dictionaries/new" }),
  );
  return {
    isTaskView,
    // Remembered for one pathname only, so the choice resets on navigation.
    isListShown: !isTaskView || shownOnPathname === pathname,
    onToggleList: () => {
      setShownOnPathname((current) => {
        return current === pathname ? undefined : pathname;
      });
    },
  };
}

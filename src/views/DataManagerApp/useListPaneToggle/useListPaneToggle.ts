import { useMediaQuery } from "@mantine/hooks";
import { useLocation, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";

/**
 * Whether the Data Sources list shows beside the current view. A task view
 * (the create flow) hides it by default to free width for its tables, and
 * Show list brings it back until the pathname changes, including on coming
 * back to the same route later. Every other view always shows it. On a
 * phone the list and the view never share the row, so the toggle is not
 * offered. Used by `DataManagerApp` and its toolbar.
 */
export function useListPaneToggle(): {
  isTaskView: boolean;
  isToggleOffered: boolean;
  isListShown: boolean;
  onToggleList: () => void;
} {
  const matchRoute = useMatchRoute();
  const pathname = useLocation({
    select: (location) => {
      return location.pathname;
    },
  });
  // `undefined` before the first measure, which counts as not a phone.
  const isPhone = useMediaQuery("(width < 48em)") === true;
  const [isShown, setIsShown] = useState(false);
  const [shownPathname, setShownPathname] = useState(pathname);
  if (shownPathname !== pathname) {
    // The choice belongs to one visit of a pathname, so any change resets it.
    setShownPathname(pathname);
    setIsShown(false);
  }
  const isTaskView = Boolean(
    matchRoute({ to: "/$workspaceSlug/data-manager/dictionaries/new" }),
  );
  return {
    isTaskView,
    isToggleOffered: isTaskView && !isPhone,
    isListShown: !isTaskView || isShown,
    onToggleList: () => {
      setIsShown((current) => {
        return !current;
      });
    },
  };
}

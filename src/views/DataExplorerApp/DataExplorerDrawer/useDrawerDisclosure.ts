import { useCallback, useState } from "react";
import type { DrawerTab } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";

/**
 * Where the drawer is in its lifecycle. One value rather than a pair of
 * booleans, so "open but never opened" cannot be represented.
 */
type OpenState = "unopened" | "open" | "collapsed";

type DrawerDisclosure = {
  /** The tab that is showing, or that will show when the drawer reopens. */
  activeTab: DrawerTab;

  /** Whether the drawer is currently shut. */
  isCollapsed: boolean;

  /** Whether the drawer has been opened at least once this view. */
  hasOpened: boolean;

  /** Selects a tab, which also opens the drawer on it. */
  onTabChange: (nextTab: DrawerTab) => void;

  /** Opens the drawer on the last showing tab, or shuts it. */
  onToggleCollapsed: () => void;
};

/**
 * Owns which drawer tab is showing and whether the drawer is open.
 *
 * The drawer starts shut, and there are two ways in: the chevron reopens
 * whichever tab was last showing, and a tab label opens that tab. `hasOpened`
 * latches on the first open so the host can keep the panels out of the tree
 * until then; it never returns to false.
 *
 * None of this is persisted: it resets with the view.
 */
export function useDrawerDisclosure(): DrawerDisclosure {
  const [activeTab, setActiveTab] = useState<DrawerTab>("query");
  const [openState, setOpenState] = useState<OpenState>("unopened");

  const isCollapsed = openState !== "open";

  const onTabChange = useCallback((nextTab: DrawerTab) => {
    setActiveTab(nextTab);
    // Picking a tab is also a request to open.
    setOpenState("open");
  }, []);

  // Reads the current state through the updater rather than closing over
  // `isCollapsed`, so the empty dependency list stays honest: capturing that
  // derived boolean would freeze the toggle on its first-render value.
  const onToggleCollapsed = useCallback(() => {
    setOpenState((currentState) => {
      return currentState === "open" ? "collapsed" : "open";
    });
  }, []);

  return {
    activeTab,
    isCollapsed,
    hasOpened: openState !== "unopened",
    onTabChange,
    onToggleCollapsed,
  };
}

import { ActionIcon } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { AppShellStateManager } from "@/components/AppShell/AppShellStateManager";

/**
 * Toggle icon to control the navbar
 */
export function NavbarSidebarToggle(): JSX.Element {
  const [{ isNavbarSidebarCollapsed }, dispatch] =
    AppShellStateManager.useContext();

  return (
    <Tooltip
      label={isNavbarSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
    >
      <ActionIcon
        variant="subtle"
        size="md"
        color="neutral"
        onClick={dispatch.toggleNavbarSidebar}
        aria-label="Close sidebar"
        // only visible in sizes larger than mobile
        visibleFrom="sm"
      >
        {isNavbarSidebarCollapsed ?
          <IconLayoutSidebarLeftExpand size={18} />
        : <IconLayoutSidebarLeftCollapse size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

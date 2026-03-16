import { ActionIcon } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { AppShellStateManager } from "@/lib/ui/AppShell/AppShellStateManager";
import { Tooltip } from "@ui/Tooltip/Tooltip";

/**
 * Toggle icon to control the navbar
 */
export function NavbarDesktopToggle(): JSX.Element {
  const [{ isDesktopNavbarCollapsed }, dispatch] =
    AppShellStateManager.useContext();

  return (
    <Tooltip
      label={isDesktopNavbarCollapsed ? "Open sidebar" : "Close sidebar"}
    >
      <ActionIcon
        variant="subtle"
        size="md"
        color="neutral"
        onClick={dispatch.toggleDesktopNavbar}
        aria-label="Close sidebar"
        // only visible in sizes larger than mobile
        visibleFrom="sm"
      >
        {isDesktopNavbarCollapsed ?
          <IconLayoutSidebarLeftExpand size={18} />
        : <IconLayoutSidebarLeftCollapse size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

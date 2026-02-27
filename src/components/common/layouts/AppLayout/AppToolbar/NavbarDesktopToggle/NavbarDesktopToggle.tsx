import { ActionIcon } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { AppShellStateManager } from "@/lib/ui/AppShell/AppShellStateManager";
import { AvaTooltip } from "@/lib/ui/AvaTooltip";

/**
 * Toggle icon to control the navbar
 */
export function NavbarDesktopToggle(): JSX.Element {
  const [{ isDesktopNavbarCollapsed }, dispatch] =
    AppShellStateManager.useContext();

  return (
    <AvaTooltip
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
    </AvaTooltip>
  );
}

import { useLingui } from "@lingui/react/macro";
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
export function NavbarDesktopToggle(): JSX.Element {
  const { t } = useLingui();
  const [{ isDesktopNavbarCollapsed }, dispatch] =
    AppShellStateManager.useContext();

  return (
    <Tooltip
      label={isDesktopNavbarCollapsed ? t`Open sidebar` : t`Close sidebar`}
    >
      <ActionIcon
        variant="subtle"
        size="md"
        color="neutral"
        onClick={dispatch.toggleDesktopNavbar}
        aria-label={
          isDesktopNavbarCollapsed ? t`Open sidebar` : t`Close sidebar`
        }
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

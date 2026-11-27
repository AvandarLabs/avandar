import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { AppShellStateManager } from "@/components/AppShell/AppShellStateManager";

/**
 * Renders a control for opening or closing the navigation sidebar.
 * Use it, for example, in a desktop toolbar that controls sidebar visibility.
 */
export function NavbarSidebarToggle(): JSX.Element {
  const { t } = useLingui();
  const [{ isNavbarSidebarCollapsed }, dispatch] =
    AppShellStateManager.useContext();

  return (
    <Tooltip
      label={isNavbarSidebarCollapsed ? t`Open sidebar` : t`Close sidebar`}
    >
      <ActionIcon
        variant="subtle"
        size="md"
        color="neutral"
        onClick={dispatch.toggleNavbarSidebar}
        aria-label={
          isNavbarSidebarCollapsed ? t`Open sidebar` : t`Close sidebar`
        }
        // only visible in sizes larger than mobile
        visibleFrom="sm"
      >
        {isNavbarSidebarCollapsed ? (
          <IconLayoutSidebarLeftExpand size={18} />
        ) : (
          <IconLayoutSidebarLeftCollapse size={18} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}

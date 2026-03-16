import { useToggleBoolean } from "@hooks/useToggleBoolean/useToggleBoolean";
import { AppShell as MantineAppShell } from "@mantine/core";
import {
  Spotlight,
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { Outlet } from "@tanstack/react-router";
import { useIsMobileSize } from "@/lib/hooks/ui/useIsMobileSize";
import css from "./AppShell.module.css";
import { AppShellStateManager } from "./AppShellStateManager";
import { MobileHeader } from "./MobileHeader";
import { Navbar } from "./Navbar/Navbar";
import type { AppLink } from "@/config/AppLinks";
import type { NavbarLink } from "@/config/NavbarLinks";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const HEADER_MOBILE_DEFAULT_HEIGHT = 42;
const NAVBAR_DEFAULT_WIDTH = 220;

type Props = {
  /**
   * The main content of the app shell.
   * Defaults to `<Outlet />` so it can be used in a router.
   */
  children?: ReactNode;
  title?: string;
  defaultNavbarWidth?: number;
  spotlightActions?: Array<SpotlightActionData | SpotlightActionGroupData>;
  profileLink?: AppLink;

  /** Core navbar links, listed at the top of the navbar */
  navbarLinks: readonly NavbarLink[];

  /** Utility links go on the bottom of the navbar */
  utilityLinks?: readonly NavbarLink[];
  currentWorkspace?: Workspace.WithSubscription;
};

/**
 * The main app shell component.
 * The main content defaults to just being an `<Outlet />` component so it
 * can be used as a layout in the router.
 */
function AppShellComponent({
  children = <Outlet />,
  title,
  profileLink,
  spotlightActions,
  navbarLinks,
  currentWorkspace,
  utilityLinks = [],
}: Props): JSX.Element {
  const { isDesktopNavbarCollapsed } = AppShellStateManager.useState();
  const [isMobileNavbarOpened, toggleMobileNavbar] = useToggleBoolean(false);
  const isMobileViewSize = useIsMobileSize() ?? false;

  return (
    <>
      <MantineAppShell
        layout="default"
        header={{
          height: isMobileViewSize ? HEADER_MOBILE_DEFAULT_HEIGHT : 0,
        }}
        classNames={{ navbar: css.navbar, root: css.root, main: css.main }}
        navbar={{
          width: NAVBAR_DEFAULT_WIDTH,
          breakpoint: "sm",
          collapsed: {
            mobile: !isMobileNavbarOpened,
            desktop: isDesktopNavbarCollapsed,
          },
        }}
        padding="md"
      >
        <MantineAppShell.Header bg="neutral" withBorder={false}>
          {isMobileViewSize ?
            <MobileHeader
              isMobileNavbarOpened={isMobileNavbarOpened}
              onToggleMobileNavbar={toggleMobileNavbar}
              title={title}
            />
          : null}
        </MantineAppShell.Header>

        <MantineAppShell.Navbar withBorder={false}>
          <Navbar
            isMobileNavbarOpened={isMobileNavbarOpened}
            onToggleMobileNavbar={toggleMobileNavbar}
            title={title}
            profileLink={profileLink}
            navbarLinks={navbarLinks}
            utilityLinks={utilityLinks}
            currentWorkspace={currentWorkspace}
          />
        </MantineAppShell.Navbar>
        <MantineAppShell.Main py="0" pr="0" ml={-16}>
          {children}
        </MantineAppShell.Main>
      </MantineAppShell>

      <Spotlight
        highlightQuery
        actions={spotlightActions ?? []}
        nothingFound="Nothing found..."
        searchProps={{
          leftSection: <IconSearch size={20} stroke={1.5} />,
          placeholder: "Search...",
        }}
      />
    </>
  );
}

export function AppShell(props: Props): JSX.Element {
  return (
    <AppShellStateManager.Provider>
      <AppShellComponent {...props} />
    </AppShellStateManager.Provider>
  );
}

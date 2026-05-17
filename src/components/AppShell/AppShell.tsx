import { useToggleBoolean } from "@hooks";
import { AppShell as MantineAppShell } from "@mantine/core";
import {
  Spotlight,
  SpotlightActionData,
  SpotlightActionGroupData,
} from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { Outlet } from "@tanstack/react-router";
import css from "@/components/AppShell/AppShell.module.css";
import { AppShellStateManager } from "@/components/AppShell/AppShellStateManager";
import { MobileHeader } from "@/components/AppShell/MobileHeader";
import { Navbar } from "@/components/AppShell/Navbar/Navbar";
import { HEADER_DESKTOP_TITLEBAR_HEIGHT } from "@/components/layouts/AppLayout/AppLayout";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useIsMobileSize } from "@/lib/hooks/ui/useIsMobileSize";
import type { AppLink } from "@/config/AppLinks";
import type { NavbarLink } from "@/config/NavbarLinks";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CSSProperties, ReactNode } from "react";

// `-webkit-app-region: drag` is what Electrobun's preload detects on
// mousedown to send `startWindowMove` to native. We render a real <div>
// filling the (otherwise empty) Mantine header rather than passing the
// style to <AppShell.Header style={…}> directly, because Mantine doesn't
// reliably forward `style` as an inline `style="…"` attribute — and
// Electrobun's detector specifically looks for the substring in the inline
// attribute (`[style*="app-region"][style*="drag"]`).
const DRAG_REGION_FILL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  WebkitAppRegion: "drag",
} as CSSProperties;

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
  const platformType = usePlatformInfo();
  const isDesktopPlatform = platformType === "desktop";

  const headerHeight =
    isMobileViewSize ? HEADER_MOBILE_DEFAULT_HEIGHT
    : isDesktopPlatform ? HEADER_DESKTOP_TITLEBAR_HEIGHT
    : 0;

  return (
    <>
      <MantineAppShell
        layout="default"
        header={{ height: headerHeight }}
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
          {isDesktopPlatform && !isMobileViewSize ?
            <div
              aria-hidden
              className="electrobun-webkit-app-region-drag"
              style={DRAG_REGION_FILL_STYLE}
            />
          : null}
          {isMobileViewSize ?
            <MobileHeader
              isMobileNavbarOpened={isMobileNavbarOpened}
              onToggleMobileNavbar={toggleMobileNavbar}
              title={title}
            />
          : null}
        </MantineAppShell.Header>

        <MantineAppShell.Navbar
          withBorder={false}
          style={
            isMobileViewSize ?
              { zIndex: 300, marginTop: -40, height: "100%" }
            : undefined
          }
        >
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
        <MantineAppShell.Main
          py="0"
          pr="0"
          ml={-16}
          mt={isMobileViewSize ? 30 : 0}
        >
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

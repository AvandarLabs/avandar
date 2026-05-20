import { useToggleBoolean } from "@hooks";
import { useLingui } from "@lingui/react/macro";
import { AppShell as MantineAppShell } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
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
import { ChatPanel } from "@/components/ChatPanel/ChatPanel/ChatPanel";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { HEADER_DESKTOP_TITLEBAR_HEIGHT } from "@/components/layouts/AppLayout/AppLayout";
import { OfflineChatDownloadIndicator } from "@/components/OfflineChatDownloadIndicator/OfflineChatDownloadIndicator";
import { VoiceModelDownloadIndicator } from "@/components/VoiceModelDownloadIndicator/VoiceModelDownloadIndicator";
import { WhisperCppVoiceModelDownloadIndicator } from "@/components/VoiceModelDownloadIndicator/WhisperCppVoiceModelDownloadIndicator";
import { WhisperCppVoiceModelLoadingNotification } from "@/components/VoiceModelDownloadIndicator/WhisperCppVoiceModelLoadingNotification";
import { VoiceModelLoadingNotification } from "@/components/VoiceModelDownloadIndicator/VoiceModelLoadingNotification";
import { APP_CHROME_Z_INDEX } from "@/config/Theme";
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

const ASIDE_DEFAULT_WIDTH = 380;

/**
 * DOM id on the AppShell's main content area. Components that need to scope
 * an overlay (drawer, popover, etc.) to the main canvas, without covering
 * the side navbar or the chat panel Aside, can target this element.
 */
export const APP_SHELL_MAIN_ID = "ava-app-shell-main";

/**
 * Mantine `useHotkeys` skips INPUT/TEXTAREA/SELECT by default. Omit TEXTAREA so
 * app chrome shortcuts (chat toggle, navbar toggle) still work in the composer.
 */
const APP_SHELL_HOTKEY_TAGS_TO_IGNORE = ["INPUT", "SELECT"] as const;

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
  /** When false, the Aside slot stays empty (e.g. no-workspace routes). */
  showChatPanel?: boolean;
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
  showChatPanel = true,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { isDesktopNavbarCollapsed } = AppShellStateManager.useState();
  const appShellDispatch = AppShellStateManager.useDispatch();
  const { isOpen: isChatPanelOpen } = ChatPanelStateManager.useState();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();
  const [isMobileNavbarOpened, toggleMobileNavbar] = useToggleBoolean(false);
  const isMobileViewSize = useIsMobileSize() ?? false;
  const platformType = usePlatformInfo();
  const isDesktopPlatform = platformType === "desktop";

  // We use mod+/ instead of mod+J because Chrome and Firefox both bind
  // mod+J to the Downloads window at the browser/OS layer and the keydown
  // never reaches the page.
  useHotkeys(
    [
      [
        "mod+/",
        () => {
          chatPanelDispatch.toggle();
        },
      ],
      [
        "mod+.",
        () => {
          appShellDispatch.toggleDesktopNavbar();
        },
      ],
    ],
    [...APP_SHELL_HOTKEY_TAGS_TO_IGNORE],
  );

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
        aside={{
          width: ASIDE_DEFAULT_WIDTH,
          breakpoint: "sm",
          collapsed: {
            mobile: true,
            desktop: !isChatPanelOpen,
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
              { zIndex: APP_CHROME_Z_INDEX, marginTop: -40, height: "100%" }
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
          id={APP_SHELL_MAIN_ID}
          py="0"
          ml={-16}
          mr={-16}
          mt={isMobileViewSize ? 30 : 0}
        >
          {children}
        </MantineAppShell.Main>
        <MantineAppShell.Aside withBorder={false} p={0} bg="transparent">
          {showChatPanel ?
            <ChatPanel />
          : null}
        </MantineAppShell.Aside>
      </MantineAppShell>

      <Spotlight
        highlightQuery
        actions={spotlightActions ?? []}
        nothingFound={t`Nothing found...`}
        searchProps={{
          leftSection: <IconSearch size={20} stroke={1.5} />,
          placeholder: t`Search...`,
        }}
      />

      <VoiceModelDownloadIndicator />
      <WhisperCppVoiceModelDownloadIndicator />
      <WhisperCppVoiceModelLoadingNotification />
      <VoiceModelLoadingNotification />
      <OfflineChatDownloadIndicator />
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

import { Container, ContainerProps, Flex, Paper } from "@mantine/core";
import { CSSProperties, ReactNode } from "react";

import css from "@/components/layouts/AppLayout/AppLayout.module.css";
import { AppToolbar } from "@/components/layouts/AppLayout/AppToolbar/AppToolbar";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";

/**
 * Enough vertical space for the macOS traffic-light buttons to sit clear of
 * the navbar's workspace pill when `titleBarStyle: "hiddenInset"` extends
 * content beneath the title bar.
 */
export const HEADER_DESKTOP_TITLEBAR_HEIGHT = 26;

// Companion drag region to the one on the AppShell header. The AppShell's
// header covers the top strip at full window width; this spacer extends the
// drag zone down through the empty space AppLayout reserves above the main
// content Paper, so the entire visible title-bar band on the main side is
// click-and-drag.
const TITLEBAR_DRAG_REGION_STYLE: CSSProperties = {
  height: HEADER_DESKTOP_TITLEBAR_HEIGHT,
  flexShrink: 0,
  WebkitAppRegion: "drag",
} as CSSProperties;

type Props = {
  /** The main app view to render. */
  children: ReactNode;

  /** If set, the toolbar will be floating. */
  floatingToolbar?: boolean;

  title?: string;

  /**
   * The right section of the toolbar where you can render app-specific buttons.
   */
  toolbarButtonSection?: ReactNode;

  /** Props to pass to the container wrapping the main content. */
  containerProps?: ContainerProps;
};

/**
 * The layout for an app view. Used inside <AppShell> to render
 * the main app view.
 */
export function AppLayout({
  children,
  floatingToolbar = false,
  title,
  toolbarButtonSection,
  containerProps,
}: Props): JSX.Element {
  const isDesktopPlatform = usePlatformInfo() === "desktop";

  return (
    <Flex
      direction="column"
      p="xs"
      // On desktop, drop the Flex's top padding so the drag spacer below
      // sits flush against the bottom of the AppShell header — otherwise the
      // 8px gap between them is a dead zone in the title-bar drag region.
      pt={isDesktopPlatform ? 0 : undefined}
      mah="100dvh"
      h="100dvh"
    >
      {isDesktopPlatform ? (
        <div
          aria-hidden
          className="electrobun-webkit-app-region-drag"
          style={TITLEBAR_DRAG_REGION_STYLE}
        />
      ) : null}
      <Paper className={css.paper}>
        <Flex direction="column" mih={0} flex={1} gap={0}>
          <AppToolbar title={title} floatingToolbar={floatingToolbar}>
            {toolbarButtonSection}
          </AppToolbar>
          <Container
            w="100%"
            fluid
            bg="gray.0"
            flex={1}
            p={0}
            h="100%"
            style={{ overflow: "auto" }}
            {...containerProps}
          >
            {children}
          </Container>
        </Flex>
      </Paper>
    </Flex>
  );
}

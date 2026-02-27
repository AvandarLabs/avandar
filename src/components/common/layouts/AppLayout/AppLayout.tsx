import {
  Container,
  ContainerProps,
  Flex,
  MantineTheme,
  Paper,
} from "@mantine/core";
import { ReactNode } from "react";
import { AppToolbar } from "./AppToolbar/AppToolbar";

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
  return (
    <Flex
      bdrs="lg"
      direction="column"
      p="xs"
      mah="100dvh"
      h="100dvh"
      style={styles.root}
    >
      <Paper
        p={0}
        mih={0}
        display="flex"
        flex={1}
        pos="relative"
        withBorder={true}
        bd="1px solid neutral.7"
        style={{
          flexDirection: "column",
          overflow: "hidden",
          overscrollBehavior: "none",
          boxShadow:
            "0 1px 2px rgba(0, 0, 0, 0.2), " + "0 8px 24px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Flex direction="column" mih={0} flex={1} gap={0}>
          <AppToolbar title={title} floatingToolbar={floatingToolbar}>
            {toolbarButtonSection}
          </AppToolbar>
          <Container
            w="100%"
            fluid
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

const styles = {
  root: (theme: MantineTheme) => {
    return {
      backgroundColor: theme.other.navbar.backgroundColor,
    };
  },
};

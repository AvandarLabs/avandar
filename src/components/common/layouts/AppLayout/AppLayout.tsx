import { Container, ContainerProps, Flex, Paper } from "@mantine/core";
import { ReactNode } from "react";
import css from "@/components/common/layouts/AppLayout/AppLayout.module.css";
import { AppToolbar } from "@/components/common/layouts/AppLayout/AppToolbar/AppToolbar";

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
    <Flex direction="column" p="xs" mah="100dvh" h="100dvh">
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

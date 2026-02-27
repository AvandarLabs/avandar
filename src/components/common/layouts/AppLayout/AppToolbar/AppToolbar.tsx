import { Box, Group, Title } from "@mantine/core";
import { ReactNode } from "react";
import { mantineColorVar } from "@/lib/utils/browser/css";
import { NavbarDesktopToggle } from "./NavbarDesktopToggle";

type Props = {
  children?: ReactNode;
  floatingToolbar?: boolean;
  title?: string;
};

export function AppToolbar({
  children,
  floatingToolbar = false,
  title,
}: Props): JSX.Element {
  return (
    <Group
      px="xxs"
      py="xxs"
      style={
        floatingToolbar ?
          {
            position: "absolute",
            zIndex: 1000,
            top: 0,
            left: 0,
            width: "fit-content",
          }
        : {
            width: "100%",
            position: "relative",
            borderBottom: `1px solid ${mantineColorVar("neutral.2")}`,
          }
      }
    >
      <NavbarDesktopToggle />
      {title ?
        <Title order={2} size="sm" fw={500}>
          {title}
        </Title>
      : null}
      <Box ml="auto" mr="xxs">
        {children}
      </Box>
    </Group>
  );
}

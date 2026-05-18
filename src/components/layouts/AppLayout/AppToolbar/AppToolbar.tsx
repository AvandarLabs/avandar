import { Group, Title } from "@mantine/core";
import { ReactNode } from "react";
import { ChatAsideToggle } from "@/components/ChatPanel/ChatAsideToggle";
import { useIsChatPanelAvailable } from "@/components/ChatPanel/useIsChatPanelAvailable";
import { NavbarDesktopToggle } from "@/components/layouts/AppLayout/AppToolbar/NavbarDesktopToggle/NavbarDesktopToggle";
import { mantineColorVar } from "@/lib/utils/browser/css";

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
  const isChatPanelAvailable = useIsChatPanelAvailable();

  return (
    <Group
      px="xxs"
      py="xxs"
      bg="white"
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
      <Group ml="auto" mr="xxs" gap="xs">
        {children}
        {isChatPanelAvailable ? <ChatAsideToggle /> : null}
      </Group>
    </Group>
  );
}

import { Group, Title } from "@mantine/core";
import { mantineColorVar } from "@ui";
import { ReactNode } from "react";
import { FeedbackButton } from "@/components/buttons/FeedbackButton/FeedbackButton";
import { ChatAsideToggle } from "@/components/ChatPanel/ChatAsideToggle/ChatAsideToggle";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NavbarSidebarToggle } from "@/components/layouts/AppLayout/AppToolbar/NavbarSidebarToggle/NavbarSidebarToggle";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";

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
  const { isAvailable: isChatPanelAvailable } =
    ChatPanelStateManager.useState();

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
      <NavbarSidebarToggle />
      {title ?
        <Title order={2} size="sm" fw={500}>
          {title}
        </Title>
      : null}
      <Group ml="auto" mr="xxs" gap="xxs">
        {children}
        {isFlagEnabled(FeatureFlag.EnableUserFeedback) ?
          <FeedbackButton />
        : null}
        {isChatPanelAvailable ?
          <ChatAsideToggle />
        : null}
      </Group>
    </Group>
  );
}

import { Group, Title } from "@mantine/core";
import { ReactNode } from "react";
import { FeedbackButton } from "@/components/buttons/FeedbackButton/FeedbackButton";
import { ChatAsideToggle } from "@/components/ChatPanel/ChatAsideToggle/ChatAsideToggle";
import { useIsChatPanelAvailable } from "@/components/ChatPanel/useIsChatPanelAvailable";
import { NavbarDesktopToggle } from "@/components/layouts/AppLayout/AppToolbar/NavbarDesktopToggle/NavbarDesktopToggle";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { APP_CHROME_Z_INDEX } from "@/config/Theme";
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
            zIndex: APP_CHROME_Z_INDEX,
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
      <Group ml="auto" mr="xxs" gap="sm" wrap="nowrap">
        {children}
        <OfflineIndicator />
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

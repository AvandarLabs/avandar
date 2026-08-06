import { Trans } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconBug, IconSparkles } from "@tabler/icons-react";
import { hasDefinedProps } from "@utils";
import { useState } from "react";
import { Route as RootRoute } from "@/routes/__root";
import {
  FEATUREBASE_BUG_BOARD,
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "./openFeaturebaseFeedbackWidget";
import { useFeaturebaseInit } from "./useFeaturebaseInit";

/**
 * Button that opens the Featurebase feedback widget (logged-in users only).
 */
export function FeedbackButton(): JSX.Element | null {
  const { user } = RootRoute.useRouteContext();
  const [menuOpened, setMenuOpened] = useState(false);
  useFeaturebaseInit();

  if (user === undefined || !hasDefinedProps(user, "email")) {
    return null;
  }

  return (
    <Menu
      onChange={setMenuOpened}
      opened={menuOpened}
      position="bottom-end"
      shadow="md"
      width={240}
    >
      <Menu.Target>
        <Button variant="default" size="compact-sm">
          <Trans>Send feedback</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconSparkles size={16} stroke={1.5} aria-hidden />}
          onClick={() => {
            openFeaturebaseFeedbackWidget({
              boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
            });
          }}
        >
          <Trans>Request a feature</Trans>
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBug size={16} stroke={1.5} aria-hidden />}
          onClick={() => {
            openFeaturebaseFeedbackWidget({
              boardName: FEATUREBASE_BUG_BOARD,
            });
          }}
        >
          <Trans>Report a bug</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

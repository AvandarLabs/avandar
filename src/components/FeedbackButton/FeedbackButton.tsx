import { Menu, UnstyledButton } from "@mantine/core";
import { IconBug, IconMessageCircle, IconSparkles } from "@tabler/icons-react";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral";
import clsx from "clsx";
import { useState } from "react";
import css from "@/components/FeedbackButton/FeedbackButton.module.css";
import { useFeaturebaseInit } from "@/components/FeedbackButton/useFeaturebaseInit";
import { APP_SHELL_MAIN_Z_INDEX } from "@/config/Theme";
import { Route as RootRoute } from "@/routes/__root";
import type { CSSProperties } from "react";

/** Featurebase default board for feature requests. */
const FEATUREBASE_FEATURE_REQUEST_BOARD = "Feature Request";

/** Featurebase default board for bug reports. */
const FEATUREBASE_BUG_BOARD = "Bug";

/** Corner anchor for the floating feedback control. */
export type FeedbackButtonPlacement =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

type Props = {
  /** Extra horizontal inset from the placement edge, in pixels. */
  offsetX?: number;
  /** Extra vertical inset from the placement edge, in pixels. */
  offsetY?: number;
  /** Which corner of the viewport to pin the button to. */
  placement?: FeedbackButtonPlacement;
};

const BASE_INSET_PX = 24;

function _getFeedbackButtonPlacementStyle(options: {
  offsetX: number;
  offsetY: number;
  placement: FeedbackButtonPlacement;
}): CSSProperties {
  const { offsetX, offsetY, placement } = options;
  const horizontal = BASE_INSET_PX + offsetX;
  const vertical = BASE_INSET_PX + offsetY;
  return matchLiteral(placement, {
    "bottom-left": { bottom: vertical, left: horizontal },
    "bottom-right": { bottom: vertical, right: horizontal },
    "top-left": { left: horizontal, top: vertical },
    "top-right": { right: horizontal, top: vertical },
  });
}

/**
 * Opens the Featurebase feedback widget, optionally preselecting a board.
 *
 * @see https://help.featurebase.app/en/articles/1261560-install-feedback-widget
 */
function _openFeaturebaseFeedbackWidget(options: { boardName: string }): void {
  window.postMessage(
    {
      target: "FeaturebaseWidget",
      data: {
        action: "openFeedbackWidget",
        setBoard: options.boardName,
      },
    },
    "*",
  );
}

/**
 * Chooses a dropdown position so the menu stays in the viewport for each
 * corner placement of the floating control.
 */
function _getMenuPosition(
  placement: FeedbackButtonPlacement,
): "bottom-end" | "bottom-start" | "top-end" | "top-start" {
  switch (placement) {
    case "bottom-left": {
      return "top-start";
    }
    case "bottom-right": {
      return "top-end";
    }
    case "top-left": {
      return "bottom-start";
    }
    case "top-right": {
      return "bottom-end";
    }
  }
}

/**
 * Floating control that opens the Featurebase feedback widget (logged-in
 * users only — matches JWT-backed init in `useFeaturebaseInit`).
 */
export function FeedbackButton({
  offsetX = 0,
  offsetY = 0,
  placement = "bottom-right",
}: Props = {}): JSX.Element | null {
  const { user } = RootRoute.useRouteContext();
  const [menuOpened, setMenuOpened] = useState(false);
  useFeaturebaseInit();

  if (user === undefined || !hasDefinedProps(user, "email")) {
    return null;
  }

  const absolutePosStyle = _getFeedbackButtonPlacementStyle({
    offsetX,
    offsetY,
    placement,
  });

  return (
    <Menu
      onChange={setMenuOpened}
      opened={menuOpened}
      position={_getMenuPosition(placement)}
      shadow="md"
      width={240}
      zIndex={APP_SHELL_MAIN_Z_INDEX + 10}
    >
      <Menu.Target>
        <Tooltip label="Feedback" multiline={false}>
          <UnstyledButton
            type="button"
            className={clsx(
              css.root,
              menuOpened ? css.rootMenuOpen : undefined,
            )}
            style={absolutePosStyle}
            aria-label="Feedback"
            aria-haspopup="menu"
          >
            <IconMessageCircle size={22} stroke={1.75} aria-hidden />
          </UnstyledButton>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconSparkles size={16} stroke={1.5} aria-hidden />}
          onClick={() => {
            _openFeaturebaseFeedbackWidget({
              boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
            });
          }}
        >
          Request a feature
        </Menu.Item>
        <Menu.Item
          leftSection={<IconBug size={16} stroke={1.5} aria-hidden />}
          onClick={() => {
            _openFeaturebaseFeedbackWidget({
              boardName: FEATUREBASE_BUG_BOARD,
            });
          }}
        >
          Report a bug
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

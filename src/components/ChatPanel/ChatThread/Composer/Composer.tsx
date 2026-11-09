import { ComposerPrimitive } from "@assistant-ui/react";
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import clsx from "clsx";
import { useRef } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { OfflineModeControl } from "@/components/ChatPanel/OfflineModeControl/OfflineModeControl";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useChatPanelComposerAutoFocus } from "@/components/ChatPanel/useChatPanelComposerAutoFocus/useChatPanelComposerAutoFocus";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { DataAgentFeature } from "@/lib/agent/dataAgent/browser/DataAgentFeature";
import css from "./Composer.module.css";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

/**
 * Which placeholder the composer shows. `dashboard` and `data` are specific
 * to a page. `disabled` explains why the input is off.
 */
type ComposerPlaceholderKind = "dashboard" | "data" | "disabled";

/**
 * Whether the composer accepts input on the current page. With the data agent
 * on, every page can chat except the case designer, which starts its own chat
 * from a kickoff flow. With it off, only Data Explorer and Dashboards can.
 */
function _isComposerEnabled(app: ChatPageContext.ChatApp): boolean {
  if (DataAgentFeature.isEnabled()) {
    return app !== "case-manager";
  }
  return app === "data-explorer" || app === "dashboards";
}

/**
 * Picks the placeholder for the current page. With the data agent on, the
 * dashboard placeholder only fits a dashboard editor, so the dashboard list
 * and every page without its own placeholder use the general data one.
 */
function _getPlaceholderKind(
  context: ChatPageContext.T,
): ComposerPlaceholderKind {
  if (!_isComposerEnabled(context.app)) {
    return "disabled";
  }
  if (context.app === "dashboards") {
    const isDashboardListWithAgent =
      DataAgentFeature.isEnabled() && context.dashboardId === undefined;
    return isDashboardListWithAgent ? "data" : "dashboard";
  }
  return "data";
}

/**
 * The message input at the bottom of the thread: a text input, the offline
 * mode control, and the send button. Input and actions are disabled where chat
 * is not available: the case designer, and with the data agent off, every
 * page other than Data Explorer and Dashboards.
 */
export function Composer(): React.ReactNode {
  const { isOpen } = ChatPanelStateManager.useState();
  const panelRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  useChatPanelComposerAutoFocus({
    isOpen,
    panelRef,
    composerInputRef,
  });

  const context = useChatPageContext();
  const { t } = useLingui();
  const chatDisabled = !_isComposerEnabled(context.app);

  const placeholder = matchLiteral(_getPlaceholderKind(context), {
    dashboard: t`Ask me to add a chart to this dashboard...`,
    data: t`Ask about your data...`,
    disabled: t`Chat is enabled in Data Explorer and Dashboards`,
  });

  return (
    <div
      ref={panelRef}
      className={css.composerContainer}
      {...NuxAnchors.props(NuxAnchors.ids.chatComposer)}
    >
      <ComposerPrimitive.Root
        className={clsx(css.composer, chatDisabled && css.composerDisabled)}
      >
        <ComposerPrimitive.Input
          ref={composerInputRef}
          className={css.composerInput}
          placeholder={placeholder}
          rows={1}
          autoFocus={false}
          disabled={chatDisabled}
          unstable_focusOnRunStart={false}
          unstable_focusOnScrollToBottom={false}
          unstable_focusOnThreadSwitched={false}
        />
        <div className={css.composerActions}>
          <OfflineModeControl disabled={chatDisabled} />
          <ComposerPrimitive.Send asChild>
            <ActionIcon
              variant="filled"
              color="primary"
              size="md"
              aria-label={t`Send message`}
              disabled={chatDisabled}
              className={css.composerSend}
            >
              <IconArrowUp size={16} stroke={2.25} />
            </ActionIcon>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
}

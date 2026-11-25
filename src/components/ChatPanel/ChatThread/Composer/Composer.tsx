import { ComposerPrimitive } from "@assistant-ui/react";
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { clsx } from "clsx";
import { useRef } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import { ChatContextTray } from "@/components/ChatPanel/ChatThread/ChatContextTray/ChatContextTray";
import { ChatComposerEditor } from "@/components/ChatPanel/ChatThread/Composer/ChatComposerEditor";
import { OfflineModeControl } from "@/components/ChatPanel/OfflineModeControl/OfflineModeControl";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useChatPanelComposerAutoFocus } from "@/components/ChatPanel/useChatPanelComposerAutoFocus/useChatPanelComposerAutoFocus";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { DataAgentFeature } from "@/lib/agent/dataAgent/browser/DataAgentFeature";
import css from "./Composer.module.css";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatSessionKind } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import type { ChatSessionActions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";

/**
 * Which placeholder the composer shows. `dashboard` and `data` are specific
 * to a page. `disabled` explains why the input is off.
 */
type ComposerPlaceholderKind = "dashboard" | "data" | "disabled";

/**
 * Whether the composer accepts input for this session on the current page.
 * A case-design session is always enabled. A data session with the agent on
 * is enabled on every page. With the agent off, only Data Explorer and
 * Dashboards can chat.
 */
function _isComposerEnabled(options: {
  app: ChatPageContext.ChatApp;
  kind: ChatSessionKind;
}): boolean {
  if (options.kind === "case-design") {
    return true;
  }
  if (DataAgentFeature.isEnabled()) {
    return true;
  }
  return options.app === "data-explorer" || options.app === "dashboards";
}

/**
 * Whether this session uses the agent editor and context tray. Only a data
 * session with the agent on does. A case-design session stays a textarea.
 */
function _isAgentComposer(kind: ChatSessionKind): boolean {
  return kind === "data" && DataAgentFeature.isEnabled();
}

/**
 * Kind of the selected session, or `data` while identity is missing or the
 * selected row is gone.
 */
function _selectedSessionKind(
  sessions: ChatSessionActions | undefined,
): ChatSessionKind {
  if (sessions === undefined) {
    return "data";
  }
  return sessions.index.sessions[sessions.index.selectedId]?.kind ?? "data";
}

/**
 * Picks the placeholder for this session on the current page. A data session
 * on a dashboard editor keeps the dashboard placeholder. Every other enabled
 * session uses the data placeholder. A disabled data session stays disabled.
 */
function _getPlaceholderKind(
  context: ChatPageContext.T,
  kind: ChatSessionKind,
): ComposerPlaceholderKind {
  if (!_isComposerEnabled({ app: context.app, kind })) {
    return "disabled";
  }
  if (kind === "data" && context.app === "dashboards") {
    const isDashboardListWithAgent =
      DataAgentFeature.isEnabled() && context.dashboardId === undefined;
    return isDashboardListWithAgent ? "data" : "dashboard";
  }
  return "data";
}

/**
 * The message input at the bottom of the thread: a text input, the offline
 * mode control, and the send button. A case-design session is an enabled
 * textarea on every page, with no context tray. A data session with the
 * agent on uses the rich text editor and tray, including on the case
 * manager. A data session with the agent off stays enabled only on Data
 * Explorer and Dashboards.
 */
export function Composer(): React.ReactNode {
  const { isOpen } = ChatPanelStateManager.useState();
  const panelRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const editorInputRef = useRef<HTMLElement | null>(null);
  const context = useChatPageContext();
  const { t } = useLingui();
  const sessions = useChatSessions();
  const kind = _selectedSessionKind(sessions);
  const chatDisabled = !_isComposerEnabled({ app: context.app, kind });
  const isAgentComposer = _isAgentComposer(kind);
  useChatPanelComposerAutoFocus({
    isOpen,
    panelRef,
    composerInputRef: isAgentComposer ? editorInputRef : composerInputRef,
  });

  const placeholder = matchLiteral(_getPlaceholderKind(context, kind), {
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
      {isAgentComposer ? (
        <div className={css.composer}>
          <ChatContextTray />
          <ChatComposerEditor
            placeholder={placeholder}
            // This branch only renders where chat is available.
            disabled={false}
            inputRef={editorInputRef}
            actions={<OfflineModeControl disabled={false} />}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}

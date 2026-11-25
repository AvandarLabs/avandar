import { useLingui } from "@lingui/react/macro";
import {
  overflowOpenIds,
  visibleOpenIds,
  type ChatSessionMeta,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import { ArchivedChatSessionsMenu } from "./ArchivedChatSessionsMenu";
import { ChatSessionOverflowMenu } from "./ChatSessionOverflowMenu";
import css from "./ChatSessionStrip.module.css";
import { ChatSessionTabs } from "./ChatSessionTabs";

function _sessionLabel(
  session: ChatSessionMeta,
  placeholderLabels: Readonly<{ data: string; caseDesign: string }>,
): string {
  if (!session.titleIsPlaceholder && session.title) {
    return session.title;
  }
  return session.kind === "case-design"
    ? placeholderLabels.caseDesign
    : placeholderLabels.data;
}

function _sessionLabels(
  sessions: Readonly<Record<string, ChatSessionMeta>>,
  placeholderLabels: Readonly<{ data: string; caseDesign: string }>,
): Record<string, string> {
  return Object.fromEntries(
    Object.values(sessions).map((session) => {
      return [session.id, _sessionLabel(session, placeholderLabels)];
    }),
  );
}

/** Shows open chat tabs, overflow chats, and the closed-chat archive. */
export function ChatSessionStrip(): React.ReactNode {
  const chatSessions = useChatSessions();
  const { t } = useLingui();
  if (!chatSessions) {
    return null;
  }
  const { index } = chatSessions;
  const placeholderLabels = {
    data: t`New chat`,
    caseDesign: t`New case type`,
  };
  const labels = _sessionLabels(index.sessions, placeholderLabels);
  return (
    <div className={css.strip}>
      <div role="tablist" aria-label={t`Chats`} className={css.tabList}>
        <ChatSessionTabs
          ids={visibleOpenIds(index)}
          labels={labels}
          selectedId={index.selectedId}
          closeLabel={t`Close chat`}
          onSelect={chatSessions.selectSession}
          onArchive={chatSessions.archiveSession}
        />
      </div>
      <ChatSessionOverflowMenu
        ids={overflowOpenIds(index)}
        labels={labels}
        menuLabel={t`More chats`}
        onSelect={chatSessions.selectSession}
      />
      <ArchivedChatSessionsMenu
        ids={index.archivedIds}
        labels={labels}
        menuLabel={t`Closed chats`}
        reopenLabel={t`Reopen chat`}
        deleteLabel={t`Delete chat`}
        onReopen={chatSessions.reopenSession}
        onDelete={chatSessions.deleteArchivedSession}
      />
    </div>
  );
}

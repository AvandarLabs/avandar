import { useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  addChatSession,
  reopenChatSession,
  selectChatSession,
  setChatSessionTitle,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import {
  ChatSessionContext,
  type ChatSessionActions,
} from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import {
  archiveStoredChatSession,
  commitChatSessionIndex,
  deleteStoredChatSession,
  loadChatSessions,
} from "@/components/ChatPanel/ChatSessionStore/ChatSessionStore";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ChatSessionIndex } from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Props = {
  children: ReactNode;
};

type SessionIdentity = {
  workspaceId: string;
  userId: string;
};

type LoadedIndex = {
  identityKey: string;
  index: ChatSessionIndex;
};

type IndexUpdate = (index: ChatSessionIndex) => ChatSessionIndex;
type UpdateIndex = (getNextIndex: IndexUpdate) => void;

function _makeIndexUpdater(
  identityKey: string,
  setLoaded: Dispatch<SetStateAction<LoadedIndex | undefined>>,
): UpdateIndex {
  return (getNextIndex) => {
    setLoaded((current) => {
      if (!current || current.identityKey !== identityKey) {
        return current;
      }
      return { identityKey, index: getNextIndex(current.index) };
    });
  };
}

function _createStartActions(
  commit: UpdateIndex,
): Pick<ChatSessionActions, "startDataSession" | "startCaseDesignSession"> {
  const addSession = (kind: "data" | "case-design") => {
    commit((index) => {
      return addChatSession(index, { id: crypto.randomUUID(), kind });
    });
  };
  return {
    startDataSession: () => {
      addSession("data");
    },
    startCaseDesignSession: () => {
      addSession("case-design");
    },
  };
}

function _createStoredActions(
  identity: Readonly<SessionIdentity>,
  update: UpdateIndex,
  commit: UpdateIndex,
): Omit<
  ChatSessionActions,
  "index" | "startDataSession" | "startCaseDesignSession"
> {
  return {
    selectSession: (sessionId) => {
      commit((index) => {
        return selectChatSession(index, sessionId);
      });
    },
    archiveSession: (sessionId) => {
      update((index) => {
        return archiveStoredChatSession(identity, index, sessionId);
      });
    },
    reopenSession: (sessionId) => {
      commit((index) => {
        return reopenChatSession(index, sessionId);
      });
    },
    deleteArchivedSession: (sessionId) => {
      update((index) => {
        return deleteStoredChatSession(identity, index, sessionId);
      });
    },
    setSessionTitle: (sessionId, title) => {
      commit((index) => {
        return setChatSessionTitle(index, { sessionId, title });
      });
    },
  };
}

function _createActions(
  identity: Readonly<SessionIdentity>,
  identityKey: string,
  setLoaded: Dispatch<SetStateAction<LoadedIndex | undefined>>,
): Omit<ChatSessionActions, "index"> {
  const update = _makeIndexUpdater(identityKey, setLoaded);
  const commit = (getNextIndex: IndexUpdate) => {
    update((index) => {
      return commitChatSessionIndex(identity, getNextIndex(index));
    });
  };
  return {
    ..._createStartActions(commit),
    ..._createStoredActions(identity, update, commit),
  };
}

/**
 * Owns the workspace-user chat session index used by the panel and case
 * manager, including persistence-backed session mutations. Outside the
 * workspace route there is no workspace, so the index stays undefined.
 */
export function ChatSessionProvider({ children }: Readonly<Props>): ReactNode {
  const workspaceMatch = useMatch({
    from: "/_auth/$workspaceSlug",
    shouldThrow: false,
  });
  return workspaceMatch ? (
    <WorkspaceChatSessionProvider>{children}</WorkspaceChatSessionProvider>
  ) : (
    <ChatSessionIndexProvider workspaceId="">
      {children}
    </ChatSessionIndexProvider>
  );
}

function WorkspaceChatSessionProvider({
  children,
}: Readonly<Props>): ReactNode {
  const workspaceId = useCurrentWorkspace().id;
  return (
    <ChatSessionIndexProvider workspaceId={workspaceId}>
      {children}
    </ChatSessionIndexProvider>
  );
}

function ChatSessionIndexProvider({
  workspaceId,
  children,
}: Readonly<Props & { workspaceId: string }>): ReactNode {
  const userId = useCurrentUser()?.id ?? "";
  const identityKey = `${workspaceId}:${userId}`;
  const identity = { workspaceId, userId };
  const [loaded, setLoaded] = useState<LoadedIndex>();

  useEffect(() => {
    if (workspaceId.length === 0 || userId.length === 0) {
      setLoaded(undefined);
      return;
    }
    setLoaded({
      identityKey,
      index: loadChatSessions({ workspaceId, userId }),
    });
  }, [identityKey, userId, workspaceId]);

  const index = loaded?.identityKey === identityKey ? loaded.index : undefined;
  const value = index
    ? { index, ..._createActions(identity, identityKey, setLoaded) }
    : undefined;
  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

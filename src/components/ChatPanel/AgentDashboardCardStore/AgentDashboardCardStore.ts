import { useMemo, useSyncExternalStore } from "react";

/** The workspace, user, and session a dashboard card belongs to. */
export type AgentDashboardCardIdentity = Readonly<{
  workspaceId: string;
  userId: string;
  sessionId: string;
}>;

/**
 * What happened to one dashboard card. A card with no status is pending.
 * `isReported` is set once the agent has read the line about it.
 */
export type AgentDashboardCardStatus =
  | {
      status: "confirmed";
      dashboardId: string;
      dashboardName: string;
      /** Added to the open editor, which still needs saving. */
      isUnsaved: boolean;
      isReported: boolean;
    }
  | { status: "cancelled"; isReported: boolean }
  | { status: "failed"; reason: "stale" | "network" | "unavailable" };

/** A confirmed or cancelled card the agent has not heard about. */
export type UnreportedDashboardCard = {
  cardId: string;
  status: Extract<
    AgentDashboardCardStatus,
    { status: "confirmed" | "cancelled" }
  >;
};

type StoredCards = Record<string, AgentDashboardCardStatus>;

const listeners = new Set<() => void>();

function _storageKey(identity: AgentDashboardCardIdentity): string {
  const { workspaceId, userId, sessionId } = identity;
  return `ava.chat.dashboardCards.${workspaceId}.${userId}.${sessionId}`;
}

function _hasIdentity(identity: AgentDashboardCardIdentity): boolean {
  return [identity.workspaceId, identity.userId, identity.sessionId].every(
    (part) => {
      return part.length > 0;
    },
  );
}

function _isStatus(value: unknown): value is AgentDashboardCardStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  switch (record.status) {
    case "confirmed":
      return (
        typeof record.dashboardId === "string" &&
        typeof record.dashboardName === "string" &&
        typeof record.isUnsaved === "boolean" &&
        typeof record.isReported === "boolean"
      );
    case "cancelled":
      return typeof record.isReported === "boolean";
    case "failed":
      return ["stale", "network", "unavailable"].includes(
        String(record.reason),
      );
    default:
      return false;
  }
}

function _parseCards(raw: string | null): StoredCards {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(([, status]) => {
        return _isStatus(status);
      }),
    ) as StoredCards;
  } catch {
    return {};
  }
}

function _readRaw(identity: AgentDashboardCardIdentity): string | null {
  try {
    return window.localStorage.getItem(_storageKey(identity));
  } catch {
    return null;
  }
}

function _read(identity: AgentDashboardCardIdentity): StoredCards {
  return _hasIdentity(identity) ? _parseCards(_readRaw(identity)) : {};
}

function _notify(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

function _write(
  identity: AgentDashboardCardIdentity,
  cards: StoredCards,
): boolean {
  if (!_hasIdentity(identity)) {
    return false;
  }
  try {
    window.localStorage.setItem(_storageKey(identity), JSON.stringify(cards));
  } catch {
    return false;
  }
  _notify();
  return true;
}

function _isUnreported(
  entry: [string, AgentDashboardCardStatus],
): entry is [string, UnreportedDashboardCard["status"]] {
  const [, status] = entry;
  return status.status !== "failed" && !status.isReported;
}

/**
 * Remembers what the user did with each dashboard confirm card the agent
 * showed, one localStorage record per chat session beside its thread and
 * tray. A card is pending until it has a status, so a card never shown
 * leaves nothing behind.
 *
 * Written by the card as the user confirms, cancels, or retries. Read when
 * a turn starts, to tell the agent about resolved cards it has not heard
 * about. A write returns false when storage refuses it, leaving the old
 * record in place.
 */
export const AgentDashboardCardStore = {
  storageKey: _storageKey,
  read: _read,
  readStatus: (
    identity: AgentDashboardCardIdentity,
    cardId: string,
  ): AgentDashboardCardStatus | undefined => {
    return _read(identity)[cardId];
  },
  setStatus: (
    identity: AgentDashboardCardIdentity,
    cardId: string,
    status: AgentDashboardCardStatus,
  ): boolean => {
    return _write(identity, { ..._read(identity), [cardId]: status });
  },
  /** Confirmed and cancelled cards the agent has not heard about, in order. */
  listUnreported: (
    identity: AgentDashboardCardIdentity,
  ): UnreportedDashboardCard[] => {
    return Object.entries(_read(identity))
      .filter(_isUnreported)
      .map(([cardId, status]) => {
        return { cardId, status };
      });
  },
  markReported: (
    identity: AgentDashboardCardIdentity,
    cardIds: readonly string[],
  ): boolean => {
    const reportedIds = new Set(cardIds);
    const marked = Object.fromEntries(
      Object.entries(_read(identity)).map(([cardId, status]) => {
        return reportedIds.has(cardId) && status.status !== "failed"
          ? [cardId, { ...status, isReported: true }]
          : [cardId, status];
      }),
    ) as StoredCards;
    return _write(identity, marked);
  },
  /** Makes a card pending again, as Retry does after a failed save. */
  clearStatus: (
    identity: AgentDashboardCardIdentity,
    cardId: string,
  ): boolean => {
    const remaining = Object.fromEntries(
      Object.entries(_read(identity)).filter(([storedId]) => {
        return storedId !== cardId;
      }),
    );
    return _write(identity, remaining);
  },
  /** Deletes the whole session's record, as closing the session does. */
  clear: (identity: AgentDashboardCardIdentity): void => {
    try {
      window.localStorage.removeItem(_storageKey(identity));
    } catch {
      // A failed delete leaves a record no index names. It is harmless.
    }
  },
  /** Calls the listener after any write. Returns the unsubscribe function. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * One card's status, or undefined while it is pending. Re-renders when any
 * card's status changes, so a card can swap from its confirm buttons to its
 * result without the caller threading state.
 */
export function useAgentDashboardCardStatus(
  identity: AgentDashboardCardIdentity | undefined,
  cardId: string,
): AgentDashboardCardStatus | undefined {
  const raw = useSyncExternalStore(AgentDashboardCardStore.subscribe, () => {
    return identity ? _readRaw(identity) : null;
  });
  return useMemo(() => {
    return _parseCards(raw)[cardId];
  }, [raw, cardId]);
}

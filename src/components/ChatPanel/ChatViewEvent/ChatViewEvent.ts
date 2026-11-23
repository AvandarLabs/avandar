import { prop } from "@avandar/utils";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ThreadMessageLike } from "@assistant-ui/react";

/** Route-scoped view snapshot for hidden chat view-change messages. */
export type ChatViewSnapshot = {
  app: ChatPageContext.ChatApp;
  route: string;
  openDatasetId?: string;
  dashboardId?: string;
};

const CONTENT_PREFIX = "[View changed:";

/**
 * A case page's route up to its case type
 * (`/<workspaceSlug>/individual-manager/<conceptId>/`), then the case's own
 * id, which ends at the next `/`, `;`, `?`, `#`, space, or the end of the
 * text. It is anchored on the workspace slug, so a slug that is itself
 * `individual-manager` cannot shift the match onto the concept id.
 */
const CASE_ID_IN_ROUTE =
  /^(\/[^/;?#\s]+\/individual-manager\/[^/;?#\s]+\/)[^/;?#\s]+/;

/** The same route inside a formatted line, anchored on its `route=` field. */
const CASE_ID_IN_LINE =
  /(route=\/[^/;?#\s]+\/individual-manager\/[^/;?#\s]+\/)[^/;?#\s]+/;

/** What a case's id becomes in a view-change line. */
const HIDDEN_CASE_ID = "<case>";

/**
 * Text with a case route's case id replaced by `<case>`, keeping the case
 * type. A case's id is never shared with a model, and the case type is
 * enough to say what kind of page is open.
 */
function _hideCaseId(text: string, pattern: RegExp): string {
  return text.replace(pattern, `$1${HIDDEN_CASE_ID}`);
}

function _messageText(message: ThreadMessageLike): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  return message.content
    .filter((part): part is { type: "text"; text: string } => {
      return part.type === "text";
    })
    .map(prop("text"))
    .join("\n");
}

function _isViewMessage(message: ThreadMessageLike): boolean {
  return ChatViewEvent.isViewChangeContent(_messageText(message));
}

/**
 * Builds, formats, and coalesces hidden view-change messages for chat
 * transcripts.
 */
export const ChatViewEvent = {
  /** Prefix that marks a formatted view-change line. */
  CONTENT_PREFIX,

  /** Metadata that marks a thread message as an internal view change. */
  metadata: {
    custom: {
      isViewChange: true,
    },
  } as const,

  /** Returns whether message metadata marks an internal view-change event. */
  isInternal: (
    messageMetadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  ): boolean => {
    return messageMetadata?.custom?.isViewChange === true;
  },

  /** Returns whether content is a formatted view-change line. */
  isViewChangeContent: (content: string): boolean => {
    return content.startsWith(CONTENT_PREFIX);
  },

  /** Builds a route-scoped snapshot from page context, omitting live SQL. */
  makeSnapshotFromPageContext: (
    options: Readonly<{
      pageContext: Readonly<
        Pick<ChatPageContext.T, "app" | "openDatasetId" | "dashboardId">
      >;
      route: string;
    }>,
  ): ChatViewSnapshot => {
    const { pageContext, route } = options;
    return {
      app: pageContext.app,
      route,
      ...(pageContext.openDatasetId
        ? { openDatasetId: pageContext.openDatasetId }
        : {}),
      ...(pageContext.dashboardId
        ? { dashboardId: pageContext.dashboardId }
        : {}),
    };
  },

  /** Returns whether two snapshots describe the same view. */
  equals: (
    options: Readonly<{
      left: Readonly<ChatViewSnapshot>;
      right: Readonly<ChatViewSnapshot>;
    }>,
  ): boolean => {
    return (
      ChatViewEvent.format(options.left) === ChatViewEvent.format(options.right)
    );
  },

  /**
   * Formats a snapshot as a stable hidden view-change line. The line is
   * sent to models, so a case page's case id is written as `<case>`. Two
   * cases of one case type therefore format, and compare, the same.
   */
  format: (snapshot: Readonly<ChatViewSnapshot>): string => {
    const route = _hideCaseId(snapshot.route, CASE_ID_IN_ROUTE);
    const dataset = snapshot.openDatasetId ?? "none";
    const dashboard = snapshot.dashboardId ?? "none";
    return (
      `[View changed: app=${snapshot.app}; route=${route}; ` +
      `dataset=${dataset}; dashboard=${dashboard}]`
    );
  },

  /**
   * A view-change line as a model should read it: a line saved before
   * `format` hid case ids gets its `route=` field's case id hidden. Call it
   * only for messages already known to be view-change lines.
   */
  toModelContent: (line: string): string => {
    return _hideCaseId(line, CASE_ID_IN_LINE);
  },

  /** Converts a snapshot into an assistant-ui thread message. */
  makeThreadMessageLikeFromSnapshot: (
    snapshot: Readonly<ChatViewSnapshot>,
  ): ThreadMessageLike => {
    return {
      role: "user",
      content: ChatViewEvent.format(snapshot),
      metadata: ChatViewEvent.metadata,
    };
  },

  /**
   * Appends or replaces a trailing view-change message so consecutive view
   * changes coalesce instead of stacking.
   */
  applyToMessages: (
    options: Readonly<{
      messages: readonly ThreadMessageLike[];
      snapshot: Readonly<ChatViewSnapshot>;
    }>,
  ): ThreadMessageLike[] => {
    const { messages, snapshot } = options;
    const formatted = ChatViewEvent.format(snapshot);
    const lastMessage = messages.at(-1);
    if (
      lastMessage &&
      _isViewMessage(lastMessage) &&
      _messageText(lastMessage) === formatted
    ) {
      return [...messages];
    }
    if (lastMessage && _isViewMessage(lastMessage)) {
      return [
        ...messages.slice(0, -1),
        ChatViewEvent.makeThreadMessageLikeFromSnapshot(snapshot),
      ];
    }
    return [
      ...messages,
      ChatViewEvent.makeThreadMessageLikeFromSnapshot(snapshot),
    ];
  },
};

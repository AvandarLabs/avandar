import {
  getAgentGadgetName,
  getGadgetTypeName,
  getUnavailableGadgetName,
} from "$/agent/mentions/AgentGadgetContext";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { replaceGadgetNames } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/replaceGadgetNames";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { AgentGadgetContextLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/createAgentGadgetContextLoader";
import type { GadgetNameReplacement } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/replaceGadgetNames";
import type { AgentTurnGadgetContext } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/** The refs a thread's user messages mention, in order. */
function _mentionedRefs(
  apiMessages: readonly ChatClientMessage.T[],
): Gadget.Ref[] {
  return apiMessages.flatMap((message) => {
    return message.role === "user"
      ? ChatMentionToken.refsFromText(message.content)
      : [];
  });
}

/** The refs once each by key, keeping the first place of each. */
function _dedupeRefs(refs: readonly Gadget.Ref[]): Gadget.Ref[] {
  const refsByKey = new Map<string, Gadget.Ref>();
  refs.forEach((ref) => {
    const key = ChatMentionToken.buildRefKey(ref);
    if (!refsByKey.has(key)) {
      refsByKey.set(key, ref);
    }
  });
  return [...refsByKey.values()];
}

/**
 * Loads the tray and every gadget the thread's user messages mention, in
 * one batch: the tray first, then mentions, each ref once. Undefined when
 * there is nothing to load. A failed load keeps the tray with no contexts,
 * so the turn still runs.
 */
export async function loadTurnGadgetContext(
  options: Readonly<{
    apiMessages: readonly ChatClientMessage.T[];
    attachedRefs: readonly Gadget.Ref[];
    loader: AgentGadgetContextLoader;
  }>,
): Promise<AgentTurnGadgetContext | undefined> {
  const refs = _dedupeRefs([
    ...options.attachedRefs,
    ..._mentionedRefs(options.apiMessages),
  ]);
  if (refs.length === 0) {
    return undefined;
  }
  try {
    return {
      attachedRefs: options.attachedRefs,
      contexts: await options.loader.load(refs),
    };
  } catch {
    return { attachedRefs: options.attachedRefs, contexts: undefined };
  }
}

/**
 * A gadget's name as the user's own device shows it, unmasked. For labels,
 * the agent path's consent check, and offline turns. Never for a hosted
 * request: the agent path masks names first, and today's chat names each
 * mention by its type only.
 */
export function buildLocalGadgetName(
  gadgetContext: AgentTurnGadgetContext | undefined,
): (ref: Gadget.Ref) => string {
  return (ref) => {
    const context = gadgetContext?.contexts?.get(
      ChatMentionToken.buildRefKey(ref),
    );
    return context
      ? getAgentGadgetName(context)
      : getUnavailableGadgetName(ref);
  };
}

/** The thread with each user message's tokens written by `nameOf`. */
function _nameUserMessageTokens(
  apiMessages: readonly ChatClientMessage.T[],
  nameOf: (ref: Gadget.Ref) => string,
): readonly ChatClientMessage.T[] {
  return apiMessages.map((message) => {
    return message.role === "user"
      ? {
          ...message,
          content: ChatMentionToken.toModelText(message.content, nameOf),
        }
      : message;
  });
}

/**
 * The thread with each user message's tokens written as `@"Name"` with
 * real, unmasked names, for uses that stay on the device: offline models,
 * the agent path's consent check, and labels. Never send it to a hosted
 * model. The same array when there is no context.
 */
export function toLocalModelMessages(
  apiMessages: readonly ChatClientMessage.T[],
  gadgetContext: AgentTurnGadgetContext | undefined,
): readonly ChatClientMessage.T[] {
  if (!gadgetContext) {
    return apiMessages;
  }
  return _nameUserMessageTokens(
    apiMessages,
    buildLocalGadgetName(gadgetContext),
  );
}

/**
 * Each loaded gadget's real names (its own name or title, and a tile's
 * dashboard name) with the text `rename` gives them. Unavailable gadgets
 * have no real name.
 */
export function buildGadgetNameReplacements(
  gadgetContext: AgentTurnGadgetContext | undefined,
  rename: (
    context: AgentGadgetContext,
    name: Readonly<{ text: string; isDashboardOfTile: boolean }>,
  ) => string,
): GadgetNameReplacement[] {
  return [...(gadgetContext?.contexts?.values() ?? [])].flatMap((context) => {
    if (context.kind === "unavailable") {
      return [];
    }
    const own = getAgentGadgetName(context);
    const ownName = {
      name: own,
      replacement: rename(context, { text: own, isDashboardOfTile: false }),
    };
    if (context.kind !== "dashboard_tile") {
      return [ownName];
    }
    const dashboardName = {
      name: context.dashboardName,
      replacement: rename(context, {
        text: context.dashboardName,
        isDashboardOfTile: true,
      }),
    };
    return [ownName, dashboardName];
  });
}

/**
 * The thread as today's hosted chat receives it: each mention named by its
 * type only, such as `@"a chart"`, and each loaded gadget's real name in an
 * assistant reply (an offline reply may quote one) replaced by its type the
 * same way. Today's chat has no vault to mask names with, so it never gets
 * a real name, a token, or an id. The loaded gadgets are read only to find
 * their names.
 */
export function toHostedChatMessages(
  apiMessages: readonly ChatClientMessage.T[],
  gadgetContext: AgentTurnGadgetContext | undefined,
): readonly ChatClientMessage.T[] {
  const replacements = buildGadgetNameReplacements(
    gadgetContext,
    (context, name) => {
      return name.isDashboardOfTile
        ? getGadgetTypeName({ ...context.ref, gadgetType: "dashboard" })
        : getGadgetTypeName(context.ref);
    },
  );
  return apiMessages.map((message) => {
    if (message.role === "user") {
      return {
        ...message,
        content: ChatMentionToken.toModelText(
          message.content,
          getGadgetTypeName,
        ),
      };
    }
    return replacements.length > 0
      ? {
          ...message,
          content: replaceGadgetNames(message.content, replacements),
        }
      : message;
  });
}

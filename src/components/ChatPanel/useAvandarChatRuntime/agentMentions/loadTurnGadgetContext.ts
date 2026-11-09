import {
  getAgentGadgetName,
  getGadgetTypeName,
  getUnavailableGadgetName,
} from "$/agent/mentions/AgentGadgetContext";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { AgentGadgetContextLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/createAgentGadgetContextLoader";
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
 * The thread as today's hosted chat receives it: each mention named by its
 * type only, such as `@"a chart"`. Today's chat has no vault to mask names
 * with, so it takes no loaded context and can never get a real name, a
 * token, or an id.
 */
export function toHostedChatMessages(
  apiMessages: readonly ChatClientMessage.T[],
): readonly ChatClientMessage.T[] {
  return _nameUserMessageTokens(apiMessages, getGadgetTypeName);
}

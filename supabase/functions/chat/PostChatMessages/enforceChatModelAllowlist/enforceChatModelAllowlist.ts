import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

/**
 * Coerces the client-supplied model id to one we actually offer.
 *
 * The picker is a fixed six-model catalog, so anything else is either a stale
 * value in a client's local storage or a crafted request. Both cases fall back
 * to the default rather than erroring, so the chat keeps working.
 *
 * This is a spend control, not just input validation. OpenRouter will happily
 * accept any real model id and bill us at that model's rate, so a passed-
 * through off-catalog id is a live cost lever for any authenticated client.
 *
 * Named `enforce…` rather than `resolve…` to keep it distinct from the
 * client-side `ChatModelStorage.resolveChatModelId`, which answers a different
 * question: which of the models the picker is currently *showing* should be
 * selected. Only this function is a trust boundary.
 */
export function enforceChatModelAllowlist(model: string | undefined): string {
  if (model === undefined) {
    return ChatModelOption.Catalog.defaultId;
  }
  if (ChatModelOption.Catalog.isValidId(model)) {
    return model;
  }
  // Nothing in this edge function has a logger, so `console` is the only
  // signal available; it lands in the Supabase edge function logs. Without
  // this, a stale client and a deliberate off-catalog probe are
  // indistinguishable: both produce a silent, successful, correctly-billed
  // request.
  console.warn(
    `Rejected off-catalog chat model "${model}"; falling back to ${ChatModelOption.Catalog.defaultId}`,
  );
  return ChatModelOption.Catalog.defaultId;
}

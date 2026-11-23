import { quoteBlockText } from "$/agent/pageContext/agentBlockText.ts";
import { isGadgetRef } from "$/models/gadgets/Gadget/Gadget.ts";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget.ts";

/**
 * The gadget types the chat's `@` menu and context tray offer. Cases are
 * left out: a case's name is usually a person's name, and personal data
 * needs consent first.
 */
export const CHAT_MENTION_TYPES = [
  "dashboard",
  "dashboard_tile",
  "dataset",
  "map",
  "concept",
] as const satisfies readonly Gadget.Type[];

/** A gadget type the chat can mention or attach. */
export type ChatMentionType = (typeof CHAT_MENTION_TYPES)[number];

/** One run of a chat message: plain text, or a mentioned gadget. */
export type ChatMentionSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; ref: Gadget.Ref };

/** `@{type:uuid}`, or `@{dashboard_tile:uuid/blockId}` for a tile. */
const TOKEN_PATTERN =
  /@\{([a-z_]+):([0-9a-fA-F-]{36})(?:\/([^{}\s/]{1,200}))?\}/g;

/** Whether a gadget type is one the chat can mention. */
export function isChatMentionType(value: string): value is ChatMentionType {
  return (CHAT_MENTION_TYPES as readonly string[]).includes(value);
}

function _refFromMatch(match: RegExpMatchArray): Gadget.Ref | undefined {
  const [, gadgetType = "", gadgetId = "", subId] = match;
  const ref = {
    gadgetType,
    gadgetId: gadgetId.toLowerCase(),
    subId: subId ?? null,
  };
  return isChatMentionType(gadgetType) && isGadgetRef(ref) ? ref : undefined;
}

function _buildToken(ref: Gadget.Ref): string {
  const sub = ref.subId === null ? "" : `/${ref.subId}`;
  return `@{${ref.gadgetType}:${ref.gadgetId}${sub}}`;
}

function _parse(text: string): ChatMentionSegment[] {
  const segments: ChatMentionSegment[] = [];
  let textStart = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const ref = _refFromMatch(match);
    const index = match.index ?? 0;
    if (ref) {
      if (index > textStart) {
        segments.push({ kind: "text", text: text.slice(textStart, index) });
      }
      segments.push({ kind: "mention", ref });
      textStart = index + match[0].length;
    }
  }
  if (textStart < text.length) {
    segments.push({ kind: "text", text: text.slice(textStart) });
  }
  return segments;
}

function _buildRefKey(ref: Gadget.Ref): string {
  return `${ref.gadgetType}:${ref.gadgetId}:${ref.subId ?? ""}`;
}

function _refsFromText(text: string): Gadget.Ref[] {
  const refsByKey = new Map<string, Gadget.Ref>();
  for (const segment of _parse(text)) {
    if (segment.kind === "mention") {
      refsByKey.set(_buildRefKey(segment.ref), segment.ref);
    }
  }
  return [...refsByKey.values()];
}

/**
 * Whether a ref survives as a token: its token parses back to exactly this
 * ref. A block id with a space, `/`, `}`, or over 200 characters does not,
 * so its token would stay raw text holding the gadget's uuid.
 */
function _isTokenizable(ref: Gadget.Ref): boolean {
  const segments = _parse(_buildToken(ref));
  const [segment] = segments;
  return (
    segments.length === 1 &&
    segment?.kind === "mention" &&
    _buildRefKey(segment.ref) === _buildRefKey(ref)
  );
}

function _replaceTokens(
  text: string,
  render: (ref: Gadget.Ref) => string,
): string {
  return _parse(text)
    .map((segment) => {
      return segment.kind === "text" ? segment.text : render(segment.ref);
    })
    .join("");
}

/**
 * Gadget mentions written into a chat message's text. The chat composer
 * writes each chip as a token holding only the gadget's ref, never its
 * name, so a stored thread never reveals a name and a renamed gadget shows
 * its current one. Only the chat's five mention types with a valid ref
 * count as tokens. Anything else stays text.
 */
export const ChatMentionToken = {
  /** The token a chip becomes in the message text. */
  buildToken: _buildToken,

  /** Whether a ref's token parses back to exactly that ref. */
  isTokenizable: _isTokenizable,

  /** Splits message text into text runs and mentions. */
  parse: _parse,

  /** Every gadget the text mentions, once each, in order. */
  refsFromText: _refsFromText,

  /** A ref's key, for maps and comparisons. */
  buildRefKey: _buildRefKey,

  /** The text as a model reads it: each token as `@"<name>"`, escaped. */
  toModelText: (text: string, nameOf: (ref: Gadget.Ref) => string): string => {
    return _replaceTokens(text, (ref) => {
      return `@${quoteBlockText(nameOf(ref))}`;
    });
  },

  /** The text as a label shows it: each token as `@<name>`. */
  toDisplayText: (
    text: string,
    nameOf: (ref: Gadget.Ref) => string,
  ): string => {
    return _replaceTokens(text, (ref) => {
      return `@${nameOf(ref)}`;
    });
  },
};

/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";
import {
  GADGET_TYPES,
  GadgetRefSchema,
} from "$/models/gadgets/Gadget/Gadget.ts";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget.ts";

/** A mark on a text node, such as bold or a link. */
type RichTextMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/** One node of a rich text document, in ProseMirror JSON form. */
type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
};

/** A whole rich text document. The root node is always `doc`. */
type RichTextDocumentT = {
  type: "doc";
  content?: RichTextNode[];
};

/**
 * Version of the stored document shape. Stored next to every document so a
 * later change of shape can be migrated by a parser instead of a data
 * migration.
 */
export const RICH_TEXT_SCHEMA_VERSION = 1;

/** Longest plain text a comment may hold. Mirrors the database check. */
export const RICH_TEXT_MAX_TEXT_LENGTH = 10000;

/** Node types the comment editor produces. */
export const RICH_TEXT_NODE_TYPES = [
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "gadgetEmbed",
  "gadgetLink",
  "hardBreak",
  "heading",
  "horizontalRule",
  "listItem",
  "orderedList",
  "paragraph",
  "text",
  "userMention",
] as const;

/** Mark types the comment editor produces. */
export const RICH_TEXT_MARK_TYPES = [
  "bold",
  "code",
  "italic",
  "link",
  "strike",
  "underline",
] as const;

/** Nodes whose children are blocks, so each child gets its own line. */
const BLOCK_CONTAINER_TYPES: ReadonlySet<string> = new Set([
  "blockquote",
  "bulletList",
  "doc",
  "listItem",
  "orderedList",
]);

/**
 * How plain text names each gadget type. Stored in `body_text`, never
 * displayed, so it is English like the "member" mention fallback.
 */
const GADGET_PLAIN_TEXT_NOUNS: Readonly<Record<Gadget.Type, string>> = {
  dashboard: "dashboard",
  dashboard_tile: "tile",
  dataset: "dataset",
  map: "map",
  concept: "case type",
  individual: "case",
};

/** Link targets a stored link may open: web pages and email addresses. */
const SAFE_LINK_HREF_PATTERN = /^(https?:|mailto:)/i;

/**
 * Whether a link may be stored and opened: only web (`http`, `https`) and
 * email (`mailto`) links. The editor and the stored document schema share
 * this check so the editor never makes a link the save would reject.
 */
export function isSafeLinkHref(href: string): boolean {
  return SAFE_LINK_HREF_PATTERN.test(href);
}

const AttrsSchema = z.record(z.string(), z.unknown());

const MarkSchema = z.union([
  z.object({
    type: z.literal("link"),
    attrs: z
      .object({ href: z.string().refine(isSafeLinkHref) })
      .catchall(z.unknown()),
  }),
  z.object({
    type: z.enum(RICH_TEXT_MARK_TYPES).exclude(["link"]),
    attrs: AttrsSchema.optional(),
  }),
]);

const NodeSchema: z.ZodType<RichTextNode> = z.lazy(() => {
  return z.union([
    z.object({
      type: z.literal("text"),
      text: z.string(),
      marks: z.array(MarkSchema).optional(),
    }),
    z.object({
      type: z.literal("userMention"),
      attrs: z.object({ id: z.uuid() }).catchall(z.unknown()),
    }),
    // Gadget nodes are strict so a stored document can never carry a
    // gadget's name, which every member could read.
    z.strictObject({
      type: z.literal("gadgetLink"),
      attrs: GadgetRefSchema,
      marks: z.array(MarkSchema).optional(),
    }),
    z.strictObject({ type: z.literal("gadgetEmbed"), attrs: GadgetRefSchema }),
    z.object({
      type: z
        .enum(RICH_TEXT_NODE_TYPES)
        .exclude(["text", "userMention", "gadgetLink", "gadgetEmbed"]),
      attrs: AttrsSchema.optional(),
      content: z.array(NodeSchema).optional(),
      marks: z.array(MarkSchema).optional(),
    }),
  ]);
});

const DocumentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(NodeSchema).optional(),
});

/**
 * Validates a stored or freshly edited document. Throws when the document
 * holds a node or mark the comment editor does not know.
 */
export function parseRichTextDocument(value: unknown): RichTextDocumentT {
  return DocumentSchema.parse(value);
}

/** Whether a value is a document the comment editor and renderer support. */
export function isRichTextDocument(value: unknown): value is RichTextDocumentT {
  return DocumentSchema.safeParse(value).success;
}

/**
 * Plain text of a document: one line per block, `@name` for each mention,
 * and `[noun]` for each gadget, such as `[dashboard]`. `getMentionLabel`
 * returns the member's current name, or `undefined` to fall back to
 * "member".
 *
 * The output is stored for search and as the fallback text, never displayed
 * as is, so the fallbacks and gadget nouns are deliberately untranslated
 * English. A gadget is never written by name because `body_text` is
 * readable by every member, including those who cannot read the gadget.
 */
export function richTextToPlainText(
  document: RichTextDocumentT | RichTextNode,
  options: Readonly<{
    getMentionLabel?: (userId: string) => string | undefined;
  }> = {},
): string {
  return _nodeToPlainText(document, options).trim();
}

function _nodeToPlainText(
  node: unknown,
  options: Readonly<{
    getMentionLabel?: (userId: string) => string | undefined;
  }>,
): string {
  if (!_isObject(node)) {
    return "";
  }
  const nodeType = _readNodeType(node);
  if (nodeType === "text") {
    return typeof node.text === "string" ? node.text : "";
  }
  if (nodeType === "hardBreak") {
    return "\n";
  }
  if (nodeType === "userMention") {
    const userId = _readMentionUserId(node) ?? "";
    return `@${options.getMentionLabel?.(userId) ?? "member"}`;
  }
  if (nodeType === "gadgetLink" || nodeType === "gadgetEmbed") {
    return `[${_readGadgetNoun(node)}]`;
  }
  const separator =
    nodeType !== undefined && BLOCK_CONTAINER_TYPES.has(nodeType) ? "\n" : "";
  return _readChildren(node)
    .map((child) => {
      return _nodeToPlainText(child, options);
    })
    .join(separator);
}

/** Each mentioned user id once, in document order. */
export function getMentionedUserIds(
  document: RichTextDocumentT | RichTextNode,
): string[] {
  const userIds = new Set<string>();
  _collectMentions(document, userIds);
  return [...userIds];
}

function _collectMentions(node: unknown, userIds: Set<string>): void {
  if (!_isObject(node)) {
    return;
  }
  if (_readNodeType(node) === "userMention") {
    const userId = _readMentionUserId(node);
    if (userId !== undefined && userId.length > 0) {
      userIds.add(userId);
    }
  }
  _readChildren(node).forEach((child) => {
    _collectMentions(child, userIds);
  });
}

/*
 * Defensive readers. A stored body is read without parsing it first, so the
 * walkers above must survive any JSON shape rather than trust the type.
 */

function _isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _readNodeType(node: Record<string, unknown>): string | undefined {
  return typeof node.type === "string" ? node.type : undefined;
}

function _readChildren(node: Record<string, unknown>): readonly unknown[] {
  return Array.isArray(node.content) ? node.content : [];
}

function _readGadgetNoun(node: Record<string, unknown>): string {
  const gadgetType = _isObject(node.attrs) ? node.attrs.gadgetType : undefined;
  const knownType = GADGET_TYPES.find((type) => {
    return type === gadgetType;
  });
  return knownType === undefined
    ? "gadget"
    : GADGET_PLAIN_TEXT_NOUNS[knownType];
}

function _readMentionUserId(node: Record<string, unknown>): string | undefined {
  const userId = _isObject(node.attrs) ? node.attrs.id : undefined;
  return typeof userId === "string" ? userId : undefined;
}

/** Rich text documents stored by comments and rendered in the case feed. */
export namespace RichTextDocument {
  export type T = RichTextDocumentT;
  export type Node = RichTextNode;
  export type Mark = RichTextMark;
}

/* eslint-disable @typescript-eslint/no-namespace */
import { z } from "zod";

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

const MarkSchema = z.object({
  type: z.enum(RICH_TEXT_MARK_TYPES),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const NodeSchema: z.ZodType<RichTextNode> = z.lazy(() => {
  return z.object({
    type: z.enum(RICH_TEXT_NODE_TYPES),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(NodeSchema).optional(),
    marks: z.array(MarkSchema).optional(),
    text: z.string().optional(),
  });
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
 * Plain text of a document: one line per block, and `@name` for each
 * mention. `getMentionLabel` returns the member's current name, or
 * `undefined` to fall back to "member".
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
  node: RichTextDocumentT | RichTextNode,
  options: Readonly<{
    getMentionLabel?: (userId: string) => string | undefined;
  }>,
): string {
  if (node.type === "text") {
    return "text" in node ? (node.text ?? "") : "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type === "userMention") {
    const userId = "attrs" in node ? String(node.attrs?.id ?? "") : "";
    return `@${options.getMentionLabel?.(userId) ?? "member"}`;
  }
  const separator = BLOCK_CONTAINER_TYPES.has(node.type) ? "\n" : "";
  return (node.content ?? [])
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

function _collectMentions(
  node: RichTextDocumentT | RichTextNode,
  userIds: Set<string>,
): void {
  if (node.type === "userMention" && "attrs" in node) {
    const userId = node.attrs?.id;
    if (typeof userId === "string" && userId.length > 0) {
      userIds.add(userId);
    }
  }
  (node.content ?? []).forEach((child) => {
    _collectMentions(child, userIds);
  });
}

/** Rich text documents stored by comments and rendered in the case feed. */
export namespace RichTextDocument {
  export type T = RichTextDocumentT;
  export type Node = RichTextNode;
  export type Mark = RichTextMark;
}

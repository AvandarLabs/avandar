import { NodeSelection, Selection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode, NodeType } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

/** A range of the document to replace, empty for a plain insert. */
type InsertRange = { from: number; to: number };

/**
 * Whether a text block holds nothing but the child at `childIndex` and
 * whitespace. Compared by index, since equal nodes are not one node.
 */
function _isOnlyContent(
  textblock: ProseMirrorNode,
  childIndex: number,
): boolean {
  let isOnlyContent = true;
  textblock.forEach((child, _offset, index) => {
    const isBlank = child.isText && (child.text ?? "").trim() === "";
    if (index !== childIndex && !isBlank) {
      isOnlyContent = false;
    }
  });
  return isOnlyContent;
}

/**
 * Whether the text block holding a position may be swapped for a node of
 * `nodeType`. A list item, for example, must start with a paragraph.
 */
function _canReplaceTextblock(
  doc: ProseMirrorNode,
  position: number,
  nodeType: NodeType,
): boolean {
  const $position = doc.resolve(position);
  const { depth } = $position;
  const blockIndex = $position.index(depth - 1);
  return $position
    .node(depth - 1)
    .canReplaceWith(blockIndex, blockIndex + 1, nodeType);
}

function _canInsertAt(
  doc: ProseMirrorNode,
  position: number,
  nodeType: NodeType,
): boolean {
  const $position = doc.resolve(position);
  const index = $position.index();
  return $position.parent.canReplaceWith(index, index, nodeType);
}

/**
 * Turns the gadget link at `position` into `embed` and selects the embed.
 * A block cannot sit in a text block, so when the link is the block's only
 * content the whole block becomes the embed; otherwise the embed goes right
 * after the block and the link is removed from it.
 */
export function replaceLinkWithEmbed(
  tr: Transaction,
  position: number,
  embed: ProseMirrorNode,
): void {
  const $link = tr.doc.resolve(position);
  const link = $link.nodeAfter;
  if (!link) {
    return;
  }
  if (
    _isOnlyContent($link.parent, $link.index()) &&
    _canReplaceTextblock(tr.doc, position, embed.type)
  ) {
    const blockStart = $link.before();
    tr.replaceWith(blockStart, $link.after(), embed);
    tr.setSelection(NodeSelection.create(tr.doc, blockStart));
    return;
  }
  const afterBlock = $link.after();
  tr.delete(position, position + link.nodeSize);
  const embedPosition = tr.mapping.map(afterBlock);
  tr.insert(embedPosition, embed);
  tr.setSelection(NodeSelection.create(tr.doc, embedPosition));
}

/**
 * Where a new embed goes for the current selection: in place of the empty
 * text block holding the cursor, after a text block that has content, or
 * after a selection outside any text block, such as a selected embed.
 * Returns `undefined` when an embed cannot go there.
 */
export function findEmbedInsertRange(
  selection: Selection,
  embedType: NodeType,
): InsertRange | undefined {
  const { $from } = selection;
  const doc = $from.doc;
  if (!$from.parent.isTextblock) {
    return _canInsertAt(doc, selection.to, embedType)
      ? { from: selection.to, to: selection.to }
      : undefined;
  }
  if (
    $from.parent.content.size === 0 &&
    _canReplaceTextblock(doc, $from.pos, embedType)
  ) {
    return { from: $from.before(), to: $from.after() };
  }
  const afterBlock = $from.after();
  return _canInsertAt(doc, afterBlock, embedType)
    ? { from: afterBlock, to: afterBlock }
    : undefined;
}

/**
 * Puts the cursor after the node at `nodePosition`, adding an empty
 * paragraph when the node is the last thing in its parent so there is
 * somewhere to keep typing.
 */
export function placeCursorAfterNode(
  tr: Transaction,
  nodePosition: number,
): void {
  const node = tr.doc.nodeAt(nodePosition);
  if (!node) {
    return;
  }
  const afterNode = nodePosition + node.nodeSize;
  const $afterNode = tr.doc.resolve(afterNode);
  const paragraphType = tr.doc.type.schema.nodes.paragraph;
  if ($afterNode.index() === $afterNode.parent.childCount && paragraphType) {
    tr.insert(afterNode, paragraphType.create());
  }
  tr.setSelection(Selection.near(tr.doc.resolve(afterNode), 1));
}

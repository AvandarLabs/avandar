import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import clsx from "clsx";
import { GadgetActionsMenu } from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu";
import { GadgetCard } from "@/components/RichText/Gadget/GadgetCard/GadgetCard";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { createGadgetRefFromAttrs } from "@/components/RichText/Gadget/GadgetNodes/createGadgetRefFromAttrs";
import classes from "@/components/RichText/Gadget/GadgetNodes/GadgetNodes.module.css";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Attribute } from "@tiptap/core";
import type { Selection } from "@tiptap/pm/state";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gadgetLink: {
      /** Inserts a link to a gadget at the cursor, followed by a space. */
      insertGadgetLink: (gadgetRef: Gadget.Ref) => ReturnType;

      /**
       * Replaces the gadget link at `position` with an embed placed after
       * the paragraph that held it.
       */
      showGadgetAsEmbed: (position: number) => ReturnType;
    };
    gadgetEmbed: {
      /** Inserts a gadget embed after the block holding the cursor. */
      insertGadgetEmbed: (gadgetRef: Gadget.Ref) => ReturnType;

      /**
       * Replaces the gadget embed at `position` with a paragraph holding a
       * link to the same gadget.
       */
      showGadgetAsLink: (position: number) => ReturnType;
    };
  }
}

/**
 * One ref attribute, written to HTML as the same `data-` attribute a
 * `GadgetChip` carries, so a copied chip pastes back as a node.
 */
function _createRefAttribute(
  attributeName: keyof Gadget.Ref,
  dataAttributeName: string,
): Attribute {
  return {
    default: null,
    parseHTML: (element) => {
      return element.getAttribute(dataAttributeName);
    },
    renderHTML: (attributes) => {
      const value = attributes[attributeName];
      return value === null ? {} : { [dataAttributeName]: value };
    },
  };
}

/** The attributes both gadget nodes store: a ref, never a name. */
const GADGET_REF_ATTRIBUTES = {
  gadgetType: _createRefAttribute("gadgetType", "data-gadget-type"),
  gadgetId: _createRefAttribute("gadgetId", "data-gadget-id"),
  subId: _createRefAttribute("subId", "data-sub-id"),
};

/** Matches only HTML elements that carry a valid gadget ref. */
function _readRefFromElement(element: HTMLElement): false | null {
  const ref = createGadgetRefFromAttrs({
    gadgetType: element.getAttribute("data-gadget-type"),
    gadgetId: element.getAttribute("data-gadget-id"),
    subId: element.getAttribute("data-sub-id"),
  });
  return ref ? null : false;
}

/**
 * Where a block inserted "after the cursor" goes: after the paragraph (or
 * other text block) holding the cursor, or after the selection when it is
 * not inside a text block, such as a selected embed.
 */
function _findPositionAfterCursorBlock(selection: Selection): number {
  const { $from } = selection;
  return $from.parent.isTextblock ? $from.after() : selection.to;
}

function GadgetLinkView({
  node,
  editor,
  getPos,
  selected,
}: NodeViewProps): ReactNode {
  const gadgetRef = createGadgetRefFromAttrs(node.attrs);
  return (
    <NodeViewWrapper as="span" className={clsx(selected && classes.selected)}>
      {gadgetRef ? (
        <GadgetActionsMenu
          gadgetRef={gadgetRef}
          display="link"
          editor={editor}
          getPos={getPos}
        >
          <GadgetChip gadgetRef={gadgetRef} />
        </GadgetActionsMenu>
      ) : null}
    </NodeViewWrapper>
  );
}

function GadgetEmbedView({
  node,
  editor,
  getPos,
  selected,
}: NodeViewProps): ReactNode {
  const gadgetRef = createGadgetRefFromAttrs(node.attrs);
  return (
    <NodeViewWrapper
      className={clsx(classes.embed, selected && classes.selected)}
    >
      {gadgetRef ? (
        <GadgetCard
          gadgetRef={gadgetRef}
          menu={
            <GadgetActionsMenu
              gadgetRef={gadgetRef}
              display="embed"
              editor={editor}
              getPos={getPos}
            />
          }
        />
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * An inline link to a gadget inside rich text, drawn as a `GadgetChip`.
 * Stores only the gadget's ref, never its name, so the stored document
 * never shows a name to members who cannot open the gadget.
 */
export const GadgetLink = Node.create({
  name: "gadgetLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return GADGET_REF_ATTRIBUTES;
  },

  parseHTML() {
    // Above the link mark, so a pasted chip's anchor becomes this node.
    return [
      {
        tag: '[data-type="gadgetLink"]',
        priority: 60,
        getAttrs: _readRefFromElement,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-type": "gadgetLink" }, HTMLAttributes),
    ];
  },

  renderText() {
    return "[gadget]";
  },

  addNodeView() {
    return ReactNodeViewRenderer(GadgetLinkView);
  },

  addCommands() {
    return {
      insertGadgetLink: (gadgetRef) => {
        return ({ commands }) => {
          return commands.insertContent([
            { type: this.name, attrs: gadgetRef },
            { type: "text", text: " " },
          ]);
        };
      },
      showGadgetAsEmbed: (position) => {
        return ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(position);
          const embedType = state.schema.nodes.gadgetEmbed;
          if (node?.type !== this.type || !embedType) {
            return false;
          }
          // A block cannot sit in a paragraph, so the embed goes after it.
          const afterParagraph = state.doc.resolve(position).after();
          if (dispatch) {
            tr.insert(afterParagraph, embedType.create(node.attrs));
            tr.delete(position, position + node.nodeSize);
          }
          return true;
        };
      },
    };
  },
});

/**
 * A gadget embedded in rich text on its own line, drawn as a `GadgetCard`.
 * Stores the same ref as `GadgetLink`, so the two switch back and forth.
 */
export const GadgetEmbed = Node.create({
  name: "gadgetEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return GADGET_REF_ATTRIBUTES;
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="gadgetEmbed"]', getAttrs: _readRefFromElement },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "gadgetEmbed" }, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GadgetEmbedView);
  },

  addCommands() {
    return {
      insertGadgetEmbed: (gadgetRef) => {
        return ({ state, tr, dispatch }) => {
          if (dispatch) {
            tr.insert(
              _findPositionAfterCursorBlock(state.selection),
              this.type.create(gadgetRef),
            );
          }
          return true;
        };
      },
      showGadgetAsLink: (position) => {
        return ({ state, tr, dispatch }) => {
          const node = state.doc.nodeAt(position);
          const { gadgetLink: linkType, paragraph: paragraphType } =
            state.schema.nodes;
          if (node?.type !== this.type || !linkType || !paragraphType) {
            return false;
          }
          if (dispatch) {
            tr.replaceWith(
              position,
              position + node.nodeSize,
              paragraphType.create(null, linkType.create(node.attrs)),
            );
          }
          return true;
        };
      },
    };
  },
});

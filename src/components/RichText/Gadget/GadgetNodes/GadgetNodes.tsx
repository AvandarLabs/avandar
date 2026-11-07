import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import clsx from "clsx";
import { richTextToPlainText } from "$/models/RichTextDocument/RichTextDocument";
import { GadgetActionsMenu } from "@/components/RichText/Gadget/GadgetActionsMenu/GadgetActionsMenu";
import { GadgetCard } from "@/components/RichText/Gadget/GadgetCard/GadgetCard";
import { UnknownGadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { createGadgetRefFromAttrs } from "@/components/RichText/Gadget/GadgetNodes/createGadgetRefFromAttrs";
import classes from "@/components/RichText/Gadget/GadgetNodes/GadgetNodes.module.css";
import {
  findEmbedInsertRange,
  placeCursorAfterNode,
  replaceLinkWithEmbed,
} from "@/components/RichText/Gadget/GadgetNodes/gadgetNodeTransforms";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Attribute } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { NodeViewProps } from "@tiptap/react";
import type { ReactNode } from "react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gadgetLink: {
      /** Inserts a link to a gadget at the cursor, followed by a space. */
      insertGadgetLink: (gadgetRef: Gadget.Ref) => ReturnType;

      /**
       * Replaces the gadget link at `position` with an embed and selects it.
       * The embed takes the place of a block holding only the link, and
       * otherwise goes right after the block that held it.
       */
      showGadgetAsEmbed: (position: number) => ReturnType;
    };
    gadgetEmbed: {
      /**
       * Inserts a gadget embed in place of the empty block holding the
       * cursor, or after the block when it has content, then moves the
       * cursor past the embed. Fails when no embed fits there.
       */
      insertGadgetEmbed: (gadgetRef: Gadget.Ref) => ReturnType;

      /**
       * Replaces the gadget embed at `position` with a paragraph holding a
       * link to the same gadget, and selects the link.
       */
      showGadgetAsLink: (position: number) => ReturnType;
    };
  }
}

/**
 * The plain text a copied gadget node becomes: its `[noun]`, written by the
 * same code that builds a stored comment's body text.
 */
function _renderGadgetText({ node }: { node: ProseMirrorNode }): string {
  return richTextToPlainText(node.toJSON());
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
        />
      ) : (
        <UnknownGadgetChip />
      )}
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
      ) : (
        <UnknownGadgetChip />
      )}
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

  renderText: _renderGadgetText,

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
          const node = tr.doc.nodeAt(position);
          const embedType = state.schema.nodes.gadgetEmbed;
          if (node?.type !== this.type || !embedType) {
            return false;
          }
          if (dispatch) {
            replaceLinkWithEmbed(tr, position, embedType.create(node.attrs));
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

  renderText: _renderGadgetText,

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
        return ({ tr, dispatch }) => {
          const range = findEmbedInsertRange(tr.selection, this.type);
          if (!range) {
            return false;
          }
          if (dispatch) {
            tr.replaceWith(range.from, range.to, this.type.create(gadgetRef));
            placeCursorAfterNode(tr, range.from);
          }
          return true;
        };
      },
      showGadgetAsLink: (position) => {
        return ({ state, tr, dispatch }) => {
          const node = tr.doc.nodeAt(position);
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
            // The link sits just inside the paragraph that replaced the embed.
            tr.setSelection(NodeSelection.create(tr.doc, position + 1));
          }
          return true;
        };
      },
    };
  },
});

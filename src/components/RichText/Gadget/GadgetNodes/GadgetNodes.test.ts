import { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";
import { isRichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import { createRichTextExtensions } from "@/components/RichText/createRichTextExtensions";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { JSONContent } from "@tiptap/core";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: DASHBOARD_ID,
  subId: null,
};

const TILE_REF: Gadget.Ref = {
  gadgetType: "dashboard_tile",
  gadgetId: DASHBOARD_ID,
  subId: "DataViz-top",
};

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function _createEditor(content: JSONContent[]): Editor {
  return new Editor({
    extensions: createRichTextExtensions(),
    content: { type: "doc", content },
  });
}

function _paragraph(...content: JSONContent[]): JSONContent {
  return content.length > 0
    ? { type: "paragraph", content }
    : { type: "paragraph" };
}

function _text(text: string): JSONContent {
  return { type: "text", text };
}

/** The position of the first node of a type, for the display switch. */
function _findPosition(target: Editor, nodeType: string): number {
  let foundPosition = -1;
  target.state.doc.descendants((node, position) => {
    if (foundPosition === -1 && node.type.name === nodeType) {
      foundPosition = position;
    }
  });
  return foundPosition;
}

/** Puts the cursor just after the first occurrence of `text`. */
function _placeCursorAfter(target: Editor, text: string): void {
  let cursor = -1;
  target.state.doc.descendants((node, position) => {
    if (cursor === -1 && node.isText && node.text?.includes(text)) {
      cursor = position + (node.text.indexOf(text) + text.length);
    }
  });
  target.view.dispatch(
    target.state.tr.setSelection(
      TextSelection.create(target.state.doc, cursor),
    ),
  );
}

describe("insertGadgetLink", () => {
  it("inserts a gadget link that stores only the gadget's ref", () => {
    editor = _createEditor([_paragraph(_text("See "))]);
    editor.commands.focus("end");
    editor.commands.insertGadgetLink(TILE_REF);
    expect(editor.getJSON().content).toEqual([
      _paragraph(
        _text("See "),
        { type: "gadgetLink", attrs: TILE_REF },
        _text(" "),
      ),
    ]);
  });
});

describe("insertGadgetEmbed", () => {
  it("inserts a top-level embed after the paragraph holding the cursor", () => {
    editor = _createEditor([
      _paragraph(_text("First")),
      _paragraph(_text("Second")),
    ]);
    _placeCursorAfter(editor, "Fir");
    editor.commands.insertGadgetEmbed(DASHBOARD_REF);
    expect(editor.getJSON().content).toEqual([
      _paragraph(_text("First")),
      { type: "gadgetEmbed", attrs: DASHBOARD_REF },
      _paragraph(_text("Second")),
    ]);
  });

  it("inserts after a selected top-level embed when the cursor is in no paragraph", () => {
    editor = _createEditor([
      { type: "gadgetEmbed", attrs: DASHBOARD_REF },
      _paragraph(_text("After")),
    ]);
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)),
    );
    editor.commands.insertGadgetEmbed(TILE_REF);
    expect(editor.getJSON().content).toEqual([
      { type: "gadgetEmbed", attrs: DASHBOARD_REF },
      { type: "gadgetEmbed", attrs: TILE_REF },
      _paragraph(_text("After")),
    ]);
  });
});

describe("showGadgetAsEmbed", () => {
  it("moves a link out of its paragraph into an embed right after it", () => {
    editor = _createEditor([
      _paragraph(
        _text("See "),
        { type: "gadgetLink", attrs: TILE_REF },
        _text(" now"),
      ),
      _paragraph(_text("Next")),
    ]);
    const isSwitched = editor.commands.showGadgetAsEmbed(
      _findPosition(editor, "gadgetLink"),
    );
    expect(isSwitched).toBe(true);
    expect(editor.getJSON().content).toEqual([
      _paragraph(_text("See  now")),
      { type: "gadgetEmbed", attrs: TILE_REF },
      _paragraph(_text("Next")),
    ]);
  });

  it("leaves the document alone when the position holds no gadget link", () => {
    editor = _createEditor([_paragraph(_text("Plain"))]);
    const before = editor.getJSON();
    expect(editor.commands.showGadgetAsEmbed(1)).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });
});

describe("showGadgetAsLink", () => {
  it("replaces an embed with a paragraph holding a link to the same gadget", () => {
    editor = _createEditor([
      _paragraph(_text("Before")),
      { type: "gadgetEmbed", attrs: TILE_REF },
      _paragraph(_text("After")),
    ]);
    const isSwitched = editor.commands.showGadgetAsLink(
      _findPosition(editor, "gadgetEmbed"),
    );
    expect(isSwitched).toBe(true);
    expect(editor.getJSON().content).toEqual([
      _paragraph(_text("Before")),
      _paragraph({ type: "gadgetLink", attrs: TILE_REF }),
      _paragraph(_text("After")),
    ]);
  });

  it("leaves the document alone when the position holds no gadget embed", () => {
    editor = _createEditor([
      _paragraph({ type: "gadgetLink", attrs: DASHBOARD_REF }),
    ]);
    const before = editor.getJSON();
    expect(
      editor.commands.showGadgetAsLink(_findPosition(editor, "gadgetLink")),
    ).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });
});

describe("gadget nodes", () => {
  it("produce a document the stored document schema accepts", () => {
    editor = _createEditor([_paragraph(_text("See "))]);
    editor.commands.focus("end");
    editor.commands.insertGadgetLink(DASHBOARD_REF);
    editor.commands.insertGadgetEmbed(TILE_REF);
    const document = editor.getJSON();
    expect(_findPosition(editor, "gadgetEmbed")).toBeGreaterThan(-1);
    expect(isRichTextDocument(document)).toBe(true);
  });

  it("parse a pasted gadget chip back into a gadget link", () => {
    editor = new Editor({
      extensions: createRichTextExtensions(),
      content: `<p><a href="/nyc/dashboards/preview/${DASHBOARD_ID}?tile=DataViz-top" data-type="gadgetLink" data-gadget-type="dashboard_tile" data-gadget-id="${DASHBOARD_ID}" data-sub-id="DataViz-top">Weekly cases</a></p>`,
    });
    expect(editor.getJSON().content).toEqual([
      _paragraph({ type: "gadgetLink", attrs: TILE_REF }),
    ]);
  });

  it("keep a pasted chip with a malformed ref as its text", () => {
    editor = new Editor({
      extensions: createRichTextExtensions(),
      content:
        '<p><span data-type="gadgetLink" data-gadget-type="query" data-gadget-id="nope">Weekly cases</span></p>',
    });
    expect(editor.getJSON().content).toEqual([
      _paragraph(_text("Weekly cases")),
    ]);
  });
});

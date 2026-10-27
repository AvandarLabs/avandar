import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { RevisionRestore } from "./RevisionRestore";
import { revisionRestoreContract } from "./RevisionRestore.contract";
import { DEFAULT_INPUT, FIXTURES } from "./RevisionRestore.fixtures";
import { inputSchema, type Input } from "./RevisionRestore.schema";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(RevisionRestore, {
        frame,
        input,
        id: "test",
        accent: "#65e2bf",
      }),
    ),
  );
}
function _texts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.artifactLabel,
    input.statusLabels.history,
    frame < 126 ? input.statusLabels.current : input.statusLabels.restored,
    ...input.revisions.flatMap((revision) => [
      ...revision.content,
      ...(input.showVersionLabels ? [revision.label] : []),
    ]),
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  contract: revisionRestoreContract,
  render: _render,
  excludedTextFields: ["id", "restoreRevisionId", "surface"],
  getVisibleTexts: _texts,
  textFrames: [36, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, restoreRevisionId: "missing" },
    { ...DEFAULT_INPUT, restoreRevisionId: "v3" },
    {
      ...DEFAULT_INPUT,
      revisions: DEFAULT_INPUT.revisions.map((revision) => ({
        ...revision,
        id: "same",
      })),
    },
    {
      ...DEFAULT_INPUT,
      revisions: DEFAULT_INPUT.revisions.map((revision) => ({
        ...revision,
        content: ["same"],
      })),
    },
  ],
});
test("restored current contents equal the selected earlier snapshot while every historical snapshot stays", () => {
  const before = _render({ frame: 36, input: DEFAULT_INPUT });
  const after = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.match(before, /data-current-content="Field summary\|Next steps"/);
  assert.match(after, /data-current-content="Field notes\|Open questions"/);
  assert.equal([...after.matchAll(/data-history-id=/g)].length, 3);
  assert.match(after, /data-history-id="v3"/);
  assert.match(before, /data-change-notch=/);
  assert.doesNotMatch(after, /data-change-notch=/);
  assert.equal(
    [...before.matchAll(/<rect[^>]*data-history-id=[^>]*>/g)]
      .map(([value]) => value)
      .join(),
    [...after.matchAll(/<rect[^>]*data-history-id=[^>]*>/g)]
      .map(([value]) => value)
      .join(),
  );
});
test("an empty earlier ID can replace three lines with one without deleting later versions", () => {
  (["page", "slate"] as const).forEach((surface) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      surface,
      showStorageDrawer: false,
      restoreRevisionId: "",
      revisions: [
        { id: "", label: "Old", content: ["Only line"] },
        { id: "空 間", label: "Later", content: ["One", "Two", "Three"] },
      ],
    };
    const after = _render({ frame: 150, input: input });
    assert.match(after, /data-current-content="Only line"/);
    assert.match(after, /data-history-id="空 間"/);
    assert.match(after, /data-storage-recess="true"/);
    assert.doesNotMatch(after, /data-change-notch=/);
  });
});
test("removing an absent restored line keeps later current lines in their original slots during replacement", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    revisions: [
      { id: "", label: "Old", content: ["Only line"] },
      { id: "later", label: "Later", content: ["One", "Two", "Three"] },
    ],
    restoreRevisionId: "",
  };
  assert.match(
    _render({ frame: 114, input: input }),
    /aria-label="Three" x="294" y="282"/,
  );
  assert.match(
    _render({ frame: 126, input: input }),
    /data-current-content="Only line"/,
  );
});
test("version and change toggles hide captions and notches without removing saved contents", () => {
  const markup = _render({
    frame: 36,
    input: {
      ...DEFAULT_INPUT,
      showVersionLabels: false,
      showChangedLines: false,
    },
  });
  assert.doesNotMatch(markup, /aria-label="Draft A"|data-change-notch=/);
  assert.equal([...markup.matchAll(/data-history-id=/g)].length, 3);
  assert.match(markup, /aria-label="Open questions"/);
});

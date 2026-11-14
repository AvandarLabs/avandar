import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueAriaProps, markSliderThumbInvalid } from "./RowIssueContext";

type StubThumb = {
  attributes: Map<string, string>;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

function createStubThumb(): StubThumb {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
}

function createStubRoot(thumb: StubThumb | null) {
  return {
    querySelector: (selector: string) =>
      selector === '[role="slider"]' ? thumb : null,
  };
}

test("buildIssueAriaProps marks a row with an issue invalid", () => {
  assert.deepEqual(buildIssueAriaProps(true), { "aria-invalid": true });
});

test("buildIssueAriaProps adds nothing for a row without an issue", () => {
  assert.deepEqual(buildIssueAriaProps(false), {});
});

test("markSliderThumbInvalid sets and clears aria-invalid on the thumb", () => {
  const thumb = createStubThumb();
  const root = createStubRoot(thumb);
  markSliderThumbInvalid(root, true);
  assert.equal(thumb.attributes.get("aria-invalid"), "true");
  markSliderThumbInvalid(root, false);
  assert.equal(thumb.attributes.has("aria-invalid"), false);
});

test("markSliderThumbInvalid ignores a missing root or thumb", () => {
  markSliderThumbInvalid(null, true);
  markSliderThumbInvalid(createStubRoot(null), true);
});

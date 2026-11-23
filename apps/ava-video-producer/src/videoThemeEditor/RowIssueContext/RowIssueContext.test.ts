import assert from "node:assert/strict";
import test from "node:test";
import {
  makeIssueAriaPropsFromIssueState,
  markSliderThumbInvalid,
} from "./rowIssueHelpers";

type StubThumb = {
  attributes: Map<string, string>;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

function _createStubThumb(): StubThumb {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name, value) => {
      return attributes.set(name, value);
    },
    removeAttribute: (name) => {
      return attributes.delete(name);
    },
  };
}

function _createStubRoot(thumb: StubThumb | null) {
  return {
    querySelector: (selector: string) => {
      return selector === '[role="slider"]' ? thumb : null;
    },
  };
}

test("makeIssueAriaPropsFromIssueState marks a row with an issue invalid", () => {
  assert.deepEqual(makeIssueAriaPropsFromIssueState(true), {
    "aria-invalid": true,
  });
});

test("makeIssueAriaPropsFromIssueState adds nothing for a row without an issue", () => {
  assert.deepEqual(makeIssueAriaPropsFromIssueState(false), {});
});

test("markSliderThumbInvalid sets and clears aria-invalid on the thumb", () => {
  const thumb = _createStubThumb();
  const root = _createStubRoot(thumb);
  markSliderThumbInvalid({ root, isInvalid: true });
  assert.equal(thumb.attributes.get("aria-invalid"), "true");
  markSliderThumbInvalid({ root, isInvalid: false });
  assert.equal(thumb.attributes.has("aria-invalid"), false);
});

test("markSliderThumbInvalid ignores a missing root or thumb", () => {
  markSliderThumbInvalid({ root: undefined, isInvalid: true });
  markSliderThumbInvalid({ root: _createStubRoot(null), isInvalid: true });
});

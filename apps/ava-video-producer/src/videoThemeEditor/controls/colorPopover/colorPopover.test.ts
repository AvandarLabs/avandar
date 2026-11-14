import assert from "node:assert/strict";
import test from "node:test";
import {
  doesEscapeBelongToColorPopover,
  isColorPopoverOpenAfter,
} from "./colorPopover";

test("the picker opens when the field is focused, clicked, or typed in", () => {
  assert.equal(isColorPopoverOpenAfter("focus"), true);
  assert.equal(isColorPopoverOpenAfter("click"), true);
  assert.equal(isColorPopoverOpenAfter("type"), true);
});

test("Enter and blur close the picker so it stops covering the next row", () => {
  assert.equal(isColorPopoverOpenAfter("enter"), false);
  assert.equal(isColorPopoverOpenAfter("blur"), false);
});

test("Escape closes the picker", () => {
  assert.equal(isColorPopoverOpenAfter("escape"), false);
});

test("Escape is held back from the dialog only while the picker is open", () => {
  assert.equal(doesEscapeBelongToColorPopover(true), true);
  assert.equal(doesEscapeBelongToColorPopover(false), false);
});

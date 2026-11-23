import assert from "node:assert/strict";
import test from "node:test";
import { hasControlPath } from "./hasControlPath";

const SHOT = {
  transition: { kind: "stepped-column-wipe", columns: 8 },
  props: { windows: [{ src: "a.png" }, { src: "b.png", swap: "cut" }] },
};
test("follows nested object fields", () => {
  assert.equal(
    hasControlPath({
      value: SHOT,
      path: ["transition", "columns"],
    }),
    true,
  );
  assert.equal(
    hasControlPath({
      value: SHOT,
      path: ["transition", "order"],
    }),
    false,
  );
});
test("matches an array segment when any element carries the rest", () => {
  assert.equal(
    hasControlPath({
      value: SHOT,
      path: ["props", "windows[]", "swap"],
    }),
    true,
  );
  assert.equal(
    hasControlPath({
      value: SHOT,
      path: ["props", "windows[]", "fit"],
    }),
    false,
  );
  assert.equal(
    hasControlPath({
      value: SHOT,
      path: ["props[]", "windows"],
    }),
    false,
  );
});

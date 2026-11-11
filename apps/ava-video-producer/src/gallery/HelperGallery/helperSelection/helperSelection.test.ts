import assert from "node:assert/strict";
import test from "node:test";
import { HELPER_CATALOG } from "../helperCatalog";
import {
  buildHelperSearch,
  filterHelpers,
  getHelperSelectionFromSearch,
} from "./helperSelection";

const identity = (message: string) => message;

test("a deep link selects its helper and category", () => {
  assert.deepEqual(
    getHelperSelectionFromSearch(
      "?section=helpers&helper=erase-mask&category=masks",
      HELPER_CATALOG,
    ),
    { helperId: "erase-mask", category: "masks", query: "" },
  );
});

test("unknown helpers and categories fall back to the first helper and all", () => {
  assert.deepEqual(
    getHelperSelectionFromSearch(
      "?section=helpers&helper=missing&category=nope",
      HELPER_CATALOG,
    ),
    { helperId: HELPER_CATALOG.helpers[0].id, category: "all", query: "" },
  );
});

test("the selection URL keeps the section and omits the default category", () => {
  assert.equal(
    buildHelperSearch({ helperId: "ramp", category: "all" }),
    "?section=helpers&helper=ramp",
  );
  assert.equal(
    buildHelperSearch({ helperId: "ease-out", category: "curves" }),
    "?section=helpers&helper=ease-out&category=curves",
  );
});

test("filtering narrows by category and by text across titles, exports and copy", () => {
  const masks = filterHelpers(HELPER_CATALOG.helpers, {
    category: "masks",
    query: "",
    translate: identity,
  });
  assert.ok(masks.length > 0);
  assert.ok(masks.every((helper) => helper.category === "masks"));
  const byExport = filterHelpers(HELPER_CATALOG.helpers, {
    category: "all",
    query: "getEraseMaskStyle",
    translate: identity,
  });
  assert.deepEqual(
    byExport.map((helper) => helper.id),
    ["erase-mask"],
  );
  const byCopy = filterHelpers(HELPER_CATALOG.helpers, {
    category: "all",
    query: "FLY-THROUGH",
    translate: identity,
  });
  assert.ok(byCopy.some((helper) => helper.id === "fly-through"));
});

test("filtering searches the translated copy a reader sees", () => {
  const results = filterHelpers(HELPER_CATALOG.helpers, {
    category: "all",
    query: "traducido",
    translate: (message) =>
      message === "Erase mask" ? "Máscara (traducido)" : message,
  });
  assert.deepEqual(
    results.map((helper) => helper.id),
    ["erase-mask"],
  );
});

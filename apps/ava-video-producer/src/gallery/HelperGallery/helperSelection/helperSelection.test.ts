import assert from "node:assert/strict";
import test from "node:test";
import { HELPER_CATALOG } from "../helperCatalog";
import {
  buildHelperSearch,
  filterHelpers,
  getHelperSelectionFromSearch,
} from "./helperSelection";

test("a deep link opens its helper and filters to its category", () => {
  assert.deepEqual(
    getHelperSelectionFromSearch(
      "?section=helpers&helper=erase-mask&category=masks",
      HELPER_CATALOG,
    ),
    { helperId: "erase-mask", category: "masks", query: "" },
  );
});

test("unknown helpers and categories open nothing and show every category", () => {
  assert.deepEqual(
    getHelperSelectionFromSearch(
      "?section=helpers&helper=missing&category=nope",
      HELPER_CATALOG,
    ),
    { helperId: undefined, category: "all", query: "" },
  );
});

test("the selection URL keeps the section and omits the defaults", () => {
  assert.equal(
    buildHelperSearch({ helperId: undefined, category: "all" }),
    "?section=helpers",
  );
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
  });
  assert.ok(masks.length > 0);
  assert.ok(masks.every((helper) => helper.category === "masks"));
  const byExport = filterHelpers(HELPER_CATALOG.helpers, {
    category: "all",
    query: "getEraseMaskStyle",
  });
  assert.deepEqual(
    byExport.map((helper) => helper.id),
    ["erase-mask"],
  );
  const byCopy = filterHelpers(HELPER_CATALOG.helpers, {
    category: "all",
    query: "FLY-THROUGH",
  });
  assert.ok(byCopy.some((helper) => helper.id === "fly-through"));
});

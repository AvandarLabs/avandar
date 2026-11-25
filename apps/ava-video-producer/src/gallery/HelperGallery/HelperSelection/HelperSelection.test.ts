import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { HELPER_CATALOG } from "../HelperFilmIds";
import { HelperSelection } from "./HelperSelection";

test("a deep link opens its helper and filters to its category", () => {
  assert.deepEqual(
    HelperSelection.getHelperSelectionFromSearch({
      search: "?section=helpers&helper=erase-mask&category=masks",
      catalog: HELPER_CATALOG,
    }),
    { helperId: "erase-mask", category: "masks", query: "" },
  );
});

test("unknown helpers and categories open nothing and show every category", () => {
  assert.deepEqual(
    HelperSelection.getHelperSelectionFromSearch({
      search: "?section=helpers&helper=missing&category=nope",
      catalog: HELPER_CATALOG,
    }),
    { helperId: undefined, category: "all", query: "" },
  );
});

test("the selection URL keeps the section and omits the defaults", () => {
  assert.equal(
    HelperSelection.makeSearchFromSelection({
      helperId: undefined,
      category: "all",
    }),
    "?section=helpers",
  );
  assert.equal(
    HelperSelection.makeSearchFromSelection({
      helperId: "ramp",
      category: "all",
    }),
    "?section=helpers&helper=ramp",
  );
  assert.equal(
    HelperSelection.makeSearchFromSelection({
      helperId: "ease-out",
      category: "curves",
    }),
    "?section=helpers&helper=ease-out&category=curves",
  );
});

test("filtering narrows by category and by text across titles, exports and copy", () => {
  const masks = HelperSelection.filterHelpers({
    helpers: HELPER_CATALOG.helpers,
    options: {
      category: "masks",
      query: "",
    },
  });
  assert.ok(masks.length > 0);
  assert.ok(masks.every(propEq("category", "masks")));
  const byExport = HelperSelection.filterHelpers({
    helpers: HELPER_CATALOG.helpers,
    options: {
      category: "all",
      query: "getEraseMaskStyle",
    },
  });
  assert.deepEqual(byExport.map(prop("id")), ["erase-mask"]);
  const byCopy = HelperSelection.filterHelpers({
    helpers: HELPER_CATALOG.helpers,
    options: {
      category: "all",
      query: "FLY-THROUGH",
    },
  });
  assert.ok(byCopy.some(propEq("id", "fly-through")));
});

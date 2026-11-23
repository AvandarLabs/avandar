import assert from "node:assert/strict";
import test from "node:test";
import { parseHelperCatalog } from "./parseHelperCatalog";

const CATEGORY = {
  id: "curves",
  title: "Curves and durations",
  description: "How fast a value moves.",
};
const MODULE = { path: "src/motion.ts", excluded: [] };
const HELPER = {
  id: "ease-out",
  title: "Ease out",
  category: "curves",
  description: "The default arrival curve.",
  source: "src/motion.ts",
  exports: ["EASE.out"],
  signature: "EASE.out: (t: number) => number",
  defaults: [{ name: "definition", value: "bezier(0.16, 1, 0.3, 1)" }],
  usage: "ramp(frame, 12, DUR.panel, EASE.out);",
  goodFor: "Entrances.",
  avoid: "Departures.",
  usedBy: ["src/scenes/GraphScene.tsx"],
  demo: { id: "curve-out", frames: 75 },
};

function createCatalog(overrides: Record<string, unknown> = {}) {
  return {
    categories: [CATEGORY],
    modules: [MODULE],
    helpers: [HELPER],
    ...overrides,
  };
}

test("preserves authored helper metadata in catalog order", () => {
  const catalog = parseHelperCatalog(createCatalog());
  assert.deepEqual(catalog.helpers, [{ ...HELPER, relatedSources: [] }]);
  assert.deepEqual(catalog.categories, [CATEGORY]);
  assert.deepEqual(catalog.modules, [
    { ...MODULE, exhaustiveMembers: [], memberModules: [] },
  ]);
});

test("rejects unknown fields instead of dropping authored copy", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ helpers: [{ ...HELPER, goodfor: "Typo" }] }),
    );
  });
});

test("rejects duplicate helper ids", () => {
  assert.throws(() => {
    return parseHelperCatalog(createCatalog({ helpers: [HELPER, HELPER] }));
  }, /Duplicate helper id: ease-out/);
});

test("rejects a helper whose category is not declared", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ helpers: [{ ...HELPER, category: "missing" }] }),
    );
  }, /Unknown category "missing" for "ease-out"/);
});

test("rejects a helper whose source module is not listed for drift checks", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ helpers: [{ ...HELPER, source: "src/other.ts" }] }),
    );
  }, /Unlisted source module "src\/other.ts" for "ease-out"/);
});

test("keeps a helper's related source modules in authored order", () => {
  const relatedSources = ["src/easeIn.ts", "src/easeOut.ts"];
  const catalog = parseHelperCatalog(
    createCatalog({
      modules: [
        MODULE,
        { path: "src/easeOut.ts", excluded: [] },
        { path: "src/easeIn.ts", excluded: [] },
      ],
      helpers: [{ ...HELPER, relatedSources }],
    }),
  );
  assert.deepEqual(catalog.helpers[0]?.relatedSources, relatedSources);
});

test("rejects a helper whose related source module is not listed for drift checks", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({
        helpers: [{ ...HELPER, relatedSources: ["src/other.ts"] }],
      }),
    );
  }, /Unlisted related source module "src\/other.ts" for "ease-out"/);
});

test("rejects an empty related source path", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ helpers: [{ ...HELPER, relatedSources: [""] }] }),
    );
  }, /relatedSources/);
});

test("rejects a declared category with no helpers", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ categories: [CATEGORY, { ...CATEGORY, id: "empty" }] }),
    );
  }, /Category "empty" has no helpers/);
});

test("rejects non-integer preview lengths and empty export lists", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({
        helpers: [{ ...HELPER, demo: { id: "curve-out", frames: 7.5 } }],
      }),
    );
  });
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ helpers: [{ ...HELPER, exports: [] }] }),
    );
  });
});

test("rejects an exclusion without a reason", () => {
  assert.throws(() => {
    return parseHelperCatalog(
      createCatalog({ modules: [{ ...MODULE, excluded: [{ name: "span" }] }] }),
    );
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  isTokenDefinition,
  isTokenScale,
  TOKEN_CONTROLS,
} from "./defineTokensHelpers";
import { MANTINE_TOKENS } from "./mantineTokens";
import { SEMANTIC_TOKENS } from "./semanticTokens/semanticTokens";
import {
  getTokenDefinitionFromPath,
  listTokenDefinitions,
} from "./tokenCatalogHelpers";
import type { CatalogNode } from "../videoTheme.types";

const NUMERIC_KINDS = new Set([
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
  "cssLength",
  "cssNumber",
]);

test("every token carries a label, a description, and a control", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    assert.ok(definition.label.length > 0, path);
    assert.ok(definition.description.length >= 12, path);
    assert.ok(TOKEN_CONTROLS[definition.kind], path);
  }
});

test("numeric tokens declare a range", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (!NUMERIC_KINDS.has(definition.kind)) {
      continue;
    }
    assert.ok(
      definition.min !== undefined &&
        definition.max !== undefined &&
        definition.min < definition.max,
      path,
    );
  }
});

test("enum tokens list at least two options", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (definition.kind === "enum" || definition.kind === "paletteName") {
      assert.ok((definition.options?.length ?? 0) >= 2, path);
    }
  }
});

test("a token path finds its definition in every tier", () => {
  assert.equal(getTokenDefinitionFromPath("color.accent")?.kind, "color");
  assert.equal(getTokenDefinitionFromPath("atomic.swatch.mint")?.kind, "color");
  assert.equal(
    getTokenDefinitionFromPath("colors.primary")?.kind,
    "colorTuple",
  );
  assert.equal(
    getTokenDefinitionFromPath("headings.sizes.h2.fontSize")?.kind,
    "cssLength",
  );
  assert.equal(
    getTokenDefinitionFromPath("components.ProgressBar.height")?.kind,
    "length",
  );
});

test("an unknown token path has no definition", () => {
  assert.equal(getTokenDefinitionFromPath("color.sparkle"), undefined);
});

test("type roles name the surface they are measured on", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (path.startsWith("text.graphic.")) {
      assert.equal(definition.surface, "graphic", path);
    }
    if (path.startsWith("text.stage.")) {
      assert.equal(definition.surface, "stage", path);
    }
  }
});

test("semantic groups never share a name with a Mantine theme key", () => {
  const mantineKeys = new Set(Object.keys(MANTINE_TOKENS));
  for (const group of Object.keys(SEMANTIC_TOKENS)) {
    assert.ok(!mantineKeys.has(group), group);
  }
});

test("no catalog group uses a key reserved for token definitions", () => {
  const visit = (node: CatalogNode, path: string): void => {
    if (isTokenDefinition(node) || isTokenScale(node)) {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      assert.ok(key !== "kind" && key !== "scale", `${path}.${key}`);
      visit(child, `${path}.${key}`);
    }
  };
  visit(SEMANTIC_TOKENS, "semantic");
});

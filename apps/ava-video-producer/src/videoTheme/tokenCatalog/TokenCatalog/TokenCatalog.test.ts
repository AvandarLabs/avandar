import assert from "node:assert/strict";
import test from "node:test";
import { COMPONENT_TOKENS } from "../componentTokens/componentTokens";
import { MANTINE_TOKENS } from "../mantineTokens";
import { SEMANTIC_TOKENS } from "../semanticTokens/semanticTokens";
import { TOKEN_CONTROLS, TokenDefinitions } from "../TokenDefinitions";
import { TokenCatalog } from "./TokenCatalog";
import type { CatalogNode } from "../../videoTheme.types";

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
  TokenCatalog.listTokenDefinitions().forEach(({ path, definition }) => {
    assert.ok(definition.label.length > 0, path);
    assert.ok(definition.description.length >= 12, path);
    assert.ok(TOKEN_CONTROLS[definition.kind], path);
  });
});

test("numeric tokens declare a range", () => {
  Array.from(TokenCatalog.listTokenDefinitions()).forEach(
    ({ path, definition }) => {
      if (NUMERIC_KINDS.has(definition.kind)) {
        assert.ok(
          definition.min !== undefined &&
            definition.max !== undefined &&
            definition.min < definition.max,
          path,
        );
      }
    },
  );
});

test("enum tokens list at least two options", () => {
  TokenCatalog.listTokenDefinitions().forEach(({ path, definition }) => {
    if (definition.kind === "enum" || definition.kind === "paletteName") {
      assert.ok((definition.options?.length ?? 0) >= 2, path);
    }
  });
});

test("a token path finds its definition in every tier", () => {
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("color.accent")?.kind,
    "color",
  );
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("atomic.swatch.mint")?.kind,
    "color",
  );
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("colors.primary")?.kind,
    "colorTuple",
  );
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("headings.sizes.h2.fontSize")?.kind,
    "cssLength",
  );
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("components.ProgressBar.height")
      ?.kind,
    "length",
  );
});

test("an unknown token path has no definition", () => {
  assert.equal(
    TokenCatalog.getTokenDefinitionFromPath("color.sparkle"),
    undefined,
  );
});

test("type roles name the surface they are measured on", () => {
  TokenCatalog.listTokenDefinitions().forEach(({ path, definition }) => {
    if (path.startsWith("text.graphic.")) {
      assert.equal(definition.surface, "graphic", path);
    }
    if (path.startsWith("text.stage.")) {
      assert.equal(definition.surface, "stage", path);
    }
  });
});

test("semantic groups never share a name with a Mantine theme key", () => {
  const mantineKeys = new Set(Object.keys(MANTINE_TOKENS));
  Object.keys(SEMANTIC_TOKENS).forEach((group) => {
    assert.ok(!mantineKeys.has(group), group);
  });
});

test("no catalog group can be mistaken for a token or a scale", () => {
  const visit = (node: CatalogNode, path: string): void => {
    if (
      TokenDefinitions.isTokenDefinition(node) ||
      TokenDefinitions.isTokenScale(node)
    ) {
      return;
    }
    const keys = Object.keys(node);
    Object.entries(node).forEach(([key, child]) => {
      assert.ok(key !== "kind", `${path}.${key}`);
      assert.ok(key !== "scale" || keys.length > 1, `${path}.${key}`);
      visit(child, `${path}.${key}`);
    });
  };
  visit(SEMANTIC_TOKENS, "semantic");
  visit(COMPONENT_TOKENS, "components");
});

test("a group may hold a token named scale beside other tokens", () => {
  assert.deepEqual(
    TokenCatalog.getTokenDefinitionFromPath("stroke.scale")?.unit,
    "×",
  );
  assert.equal(TokenDefinitions.isTokenScale(SEMANTIC_TOKENS.stroke), false);
});

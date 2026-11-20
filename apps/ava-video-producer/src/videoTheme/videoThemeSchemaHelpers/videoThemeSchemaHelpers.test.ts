import assert from "node:assert/strict";
import test from "node:test";
import classicTheme from "../../../themes/classic.theme.json";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalogHelpers/tokenCatalogHelpers";
import {
  createVideoThemeJsonSchema,
  parseVideoThemeDocument,
} from "./videoThemeSchemaHelpers";

function _sparse(video: object) {
  return {
    schemaVersion: 1,
    id: "warm",
    label: "Warm",
    extends: "classic",
    other: { video },
  };
}

test("the classic theme defines every token and passes", () => {
  assert.equal(parseVideoThemeDocument(classicTheme).id, "classic");
});

test("a theme that extends another may be sparse", () => {
  assert.equal(
    parseVideoThemeDocument(
      _sparse({ atomic: { swatch: { ground: "#201510" } } }),
    ).id,
    "warm",
  );
});

test("a theme without extends must define every token", () => {
  const sparse = {
    schemaVersion: 1,
    id: "warm",
    label: "Warm",
    other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  };
  assert.throws(() => {
    return parseVideoThemeDocument(sparse);
  }, /colors/);
});

test("a semantic token rejects a literal value", () => {
  assert.throws(() => {
    return parseVideoThemeDocument(
      _sparse({ semantic: { color: { accent: "#ff0000" } } }),
    );
  }, /accent/);
});

test("an atomic token rejects a reference", () => {
  assert.throws(() => {
    return parseVideoThemeDocument(
      _sparse({ atomic: { swatch: { ground: "$color.text" } } }),
    );
  }, /ground/);
});

test("a tempo below the slowest allowed is rejected", () => {
  assert.throws(
    () => {
      return parseVideoThemeDocument(
        _sparse({ atomic: { tempo: { md: 0.75 } } }),
      );
    },
    (error: { issues?: ReadonlyArray<{ path: readonly PropertyKey[] }> }) => {
      return (
        error.issues?.some((issue) => {
          return issue.path.join(".") === "other.video.atomic.tempo.md";
        }) ?? false
      );
    },
  );
});

test("the slowest allowed tempo is accepted", () => {
  assert.equal(
    parseVideoThemeDocument(_sparse({ atomic: { tempo: { md: 0.8 } } })).id,
    "warm",
  );
});

test("a component token accepts a literal one-off", () => {
  const document = {
    schemaVersion: 1,
    id: "thick",
    label: "Thick",
    extends: "classic",
    components: { ProgressBar: { defaultProps: { height: 6 } } },
  };
  assert.equal(parseVideoThemeDocument(document).id, "thick");
});

test("an unknown token is rejected", () => {
  assert.throws(() => {
    return parseVideoThemeDocument(
      _sparse({ semantic: { color: { sparkle: "$color.accent" } } }),
    );
  }, /sparkle/);
});

test("a font stack must belong to a registered font", () => {
  assert.throws(() => {
    return parseVideoThemeDocument({
      schemaVersion: 1,
      id: "comic",
      label: "Comic",
      extends: "classic",
      fontFamily: "Comic Sans MS, cursive",
    });
  });
});

test("theme ids are slugs", () => {
  assert.throws(() => {
    return parseVideoThemeDocument({ ..._sparse({}), id: "My Theme" });
  });
});

test("the JSON Schema carries every token's description", () => {
  const schema = JSON.stringify(createVideoThemeJsonSchema());
  for (const { path, definition } of listTokenDefinitions()) {
    assert.ok(schema.includes(JSON.stringify(definition.description)), path);
  }
});

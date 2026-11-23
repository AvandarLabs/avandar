import assert from "node:assert/strict";
import test from "node:test";
import classicTheme from "../../../themes/classic.theme.json";
import { TokenCatalog } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import { VideoThemeSchemas } from "./VideoThemeSchemas";

function _sparse(video: object): {
  schemaVersion: number;
  id: string;
  label: string;
  extends: string;
  other: { video: object };
} {
  return {
    schemaVersion: 1,
    id: "warm",
    label: "Warm",
    extends: "classic",
    other: { video },
  };
}

test("the classic theme defines every token and passes", () => {
  assert.equal(
    VideoThemeSchemas.parseVideoThemeDocument(classicTheme).id,
    "classic",
  );
});

test("a theme that extends another may be sparse", () => {
  assert.equal(
    VideoThemeSchemas.parseVideoThemeDocument(
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
    return VideoThemeSchemas.parseVideoThemeDocument(sparse);
  }, /colors/);
});

test("a semantic token rejects a literal value", () => {
  assert.throws(() => {
    return VideoThemeSchemas.parseVideoThemeDocument(
      _sparse({ semantic: { color: { accent: "#ff0000" } } }),
    );
  }, /accent/);
});

test("an atomic token rejects a reference", () => {
  assert.throws(() => {
    return VideoThemeSchemas.parseVideoThemeDocument(
      _sparse({ atomic: { swatch: { ground: "$color.text" } } }),
    );
  }, /ground/);
});

test("a tempo below the slowest allowed is rejected", () => {
  assert.throws(
    () => {
      return VideoThemeSchemas.parseVideoThemeDocument(
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
    VideoThemeSchemas.parseVideoThemeDocument(
      _sparse({ atomic: { tempo: { md: 0.8 } } }),
    ).id,
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
  assert.equal(VideoThemeSchemas.parseVideoThemeDocument(document).id, "thick");
});

test("an unknown token is rejected", () => {
  assert.throws(() => {
    return VideoThemeSchemas.parseVideoThemeDocument(
      _sparse({ semantic: { color: { sparkle: "$color.accent" } } }),
    );
  }, /sparkle/);
});

test("a font stack must belong to a registered font", () => {
  assert.throws(() => {
    return VideoThemeSchemas.parseVideoThemeDocument({
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
    return VideoThemeSchemas.parseVideoThemeDocument({
      ..._sparse({}),
      id: "My Theme",
    });
  });
});

test("the JSON Schema carries every token's description", () => {
  const schema = JSON.stringify(VideoThemeSchemas.makeJsonSchema());
  TokenCatalog.listTokenDefinitions().forEach(({ path, definition }) => {
    assert.ok(schema.includes(JSON.stringify(definition.description)), path);
  });
});

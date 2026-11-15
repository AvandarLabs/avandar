import "../../../tests/helpers/registerCssModuleStub";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HELPER_CATALOG } from "./helperCatalog";
import { HELPER_DEMO_IDS } from "./helperDemoIds";

const APP_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

async function _importModule(
  relative: string,
): Promise<Record<string, unknown>> {
  return import(pathToFileURL(path.join(APP_ROOT, relative)).href);
}

function _resolveExport(
  namespace: Record<string, unknown>,
  dotted: string,
): unknown {
  return dotted
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value !== null && typeof value === "object" && key in value
          ? (value as Record<string, unknown>)[key]
          : undefined,
      namespace,
    );
}

function _catalogedNames(source: string): Set<string> {
  return new Set(
    HELPER_CATALOG.helpers
      .filter((helper) => helper.source === source)
      .flatMap((helper) => helper.exports),
  );
}

test("every catalog source file exists and every listed export resolves", async () => {
  for (const helper of HELPER_CATALOG.helpers) {
    assert.ok(
      existsSync(path.join(APP_ROOT, helper.source)),
      `${helper.id}: missing ${helper.source}`,
    );
    const namespace = await _importModule(helper.source);
    helper.exports.forEach((name) =>
      assert.notEqual(
        _resolveExport(namespace, name),
        undefined,
        `${helper.id}: ${helper.source} does not export ${name}`,
      ),
    );
  }
});

test("every runtime export of a listed module is catalogued or explicitly excluded", async () => {
  for (const module of HELPER_CATALOG.modules) {
    const namespace = await _importModule(module.path);
    const cataloged = new Set(
      [..._catalogedNames(module.path)].map((name) => name.split(".")[0]),
    );
    const excluded = new Set(module.excluded.map((item) => item.name));
    Object.keys(namespace).forEach((name) =>
      assert.ok(
        cataloged.has(name) !== excluded.has(name),
        `${module.path}: ${name} must be either catalogued or excluded, not ${cataloged.has(name) ? "both" : "neither"}`,
      ),
    );
    excluded.forEach((name) =>
      assert.ok(name in namespace, `${module.path}: stale exclusion ${name}`),
    );
  }
});

test("every member of an exhaustive token object has its own entry", async () => {
  for (const module of HELPER_CATALOG.modules) {
    const namespace = await _importModule(module.path);
    const cataloged = _catalogedNames(module.path);
    module.exhaustiveMembers.forEach((objectName) => {
      const members = Object.keys(namespace[objectName] as object);
      assert.ok(members.length > 0, `${objectName} has no members`);
      members.forEach((member) =>
        assert.ok(
          cataloged.has(`${objectName}.${member}`),
          `${module.path}: ${objectName}.${member} is not catalogued`,
        ),
      );
    });
  }
});

/** True when `text` imports the export's top-level name and uses any member. */
function _importsExport(text: string, dotted: string): boolean {
  const [name, member] = dotted.split(".");
  const isImported = new RegExp(
    `import\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`,
  ).test(text);
  return (
    isImported &&
    (!member || new RegExp(`\\b${name}\\.${member}\\b`).test(text))
  );
}

test("every used-by file exists and imports the helper", () => {
  HELPER_CATALOG.helpers.forEach((helper) => {
    helper.usedBy.forEach((file) => {
      const filename = path.join(APP_ROOT, file);
      assert.ok(existsSync(filename), `${helper.id}: missing ${file}`);
      const text = readFileSync(filename, "utf8");
      assert.ok(
        helper.exports.some((name) => _importsExport(text, name)),
        `${helper.id}: ${file} does not import ${helper.exports.join(", ")}`,
      );
    });
  });
});

test("every helper has a registered preview and every preview is used", () => {
  const used = new Set(HELPER_CATALOG.helpers.map((helper) => helper.demo.id));
  used.forEach((id) =>
    assert.ok(
      (HELPER_DEMO_IDS as readonly string[]).includes(id),
      `unknown demo ${id}`,
    ),
  );
  HELPER_DEMO_IDS.forEach((id) =>
    assert.ok(used.has(id), `demo ${id} is not used by any helper`),
  );
});

test("preview assets are curated public files", () => {
  HELPER_CATALOG.helpers.forEach((helper) =>
    (helper.demo.assets ?? []).forEach((asset) =>
      assert.ok(
        existsSync(path.join(APP_ROOT, "public", asset)),
        `${helper.id}: missing public/${asset}`,
      ),
    ),
  );
});

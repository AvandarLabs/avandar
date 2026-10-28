import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildStockMessages } from "./buildStockMessages";
async function _withMessages(action: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stock-messages-"));
  try {
    await fs.symlink(
      path.resolve("node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
    await fs.mkdir(path.join(root, "src/stock/registry"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "src/stock/i18n"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "src/stock/i18n/decodeDefaultSpan"), {
      recursive: true,
    });
    await fs.copyFile(
      "src/stock/i18n/decodeDefaultSpan/decodeDefaultSpan.ts",
      path.join(root, "src/stock/i18n/decodeDefaultSpan/decodeDefaultSpan.ts"),
    );
    await fs.copyFile(
      "src/stock/i18n/StockCopyMessages.ts",
      path.join(root, "src/stock/i18n/StockCopyMessages.ts"),
    );
    await fs.copyFile(
      "src/stock/i18n/stockGraphicCopy.ts",
      path.join(root, "src/stock/i18n/stockGraphicCopy.ts"),
    );
    await fs.writeFile(
      path.join(root, "src/stock/registry/stockContracts.ts"),
      'export const stockContracts={test:{id:"test",metadata:{name:{id:"test.name",message:"Canonical name"}},controls:[{kind:"union",variants:[{label:{id:"test.type",message:"Text"}}]}],bindingExamples:[],defaultInput:{label:"Fresh English",id:"stable"},defaultTextPaths:[["label"]]}};',
    );
    await action(root);
  } finally {
    await fs.rm(root, {
      recursive: true,
      force: true,
    });
  }
}
test("generation compiles visible defaults and union labels without rewriting unchanged bytes", async () => {
  await _withMessages(async (root) => {
    await buildStockMessages(root);
    const filename = path.join(root, "src/stock/i18n/messages.en.generated.ts");
    const initial = await fs.readFile(filename, "utf8");
    assert.match(initial, /motionAtlas.test.default.label/);
    assert.match(initial, /"test.type": "Text"/);
    assert.doesNotMatch(initial, /"stable"/);
    const before = await fs.stat(filename);
    await buildStockMessages(root);
    assert.equal((await fs.stat(filename)).mtimeMs, before.mtimeMs);
    const contract = path.join(root, "src/stock/registry/stockContracts.ts");
    await fs.writeFile(
      contract,
      (await fs.readFile(contract, "utf8")).replace(
        "Fresh English",
        "Changed English",
      ),
    );
    await buildStockMessages(root);
    const changed = await fs.readFile(filename, "utf8");
    assert.match(changed, /Changed English/);
    assert.doesNotMatch(changed, /Fresh English/);
  });
});
test("conflicting stable IDs reject generation instead of overwriting copy", async () => {
  await _withMessages(async (root) => {
    const filename = path.join(root, "src/stock/registry/stockContracts.ts");
    await fs.writeFile(
      filename,
      (await fs.readFile(filename, "utf8")).replace(
        'id:"test.type"',
        'id:"test.name"',
      ),
    );
    await assert.rejects(
      buildStockMessages(root),
      /Conflicting stock message ID: test.name/,
    );
    await assert.rejects(
      fs.access(path.join(root, "src/stock/i18n/messages.en.generated.ts")),
    );
  });
});
test("canonical JSON copy treats braces and apostrophes as visible characters", async () => {
  await _withMessages(async (root) => {
    const filename = path.join(root, "src/stock/registry/stockContracts.ts");
    await fs.writeFile(
      filename,
      (await fs.readFile(filename, "utf8")).replace(
        "Fresh English",
        "Keep {name}'s exact copy",
      ),
    );
    await buildStockMessages(root);
    const { build } = await import("esbuild");
    const { runInNewContext } = await import("node:vm");
    const { setupI18n } = await import("@lingui/core");
    const result = await build({
      entryPoints: [path.join(root, "src/stock/i18n/messages.en.generated.ts")],
      bundle: true,
      format: "cjs",
      platform: "node",
      write: false,
      logLevel: "silent",
    });
    const loaded = {
      exports: {} as {
        messages: Record<string, string>;
      },
    };
    runInNewContext(result.outputFiles[0].text, {
      module: loaded,
      exports: loaded.exports,
    });
    const i18n = setupI18n({
      locale: "en",
      messages: {
        en: loaded.exports.messages,
      },
    });
    assert.equal(
      i18n._("motionAtlas.test.default.label"),
      "Keep {name}'s exact copy",
    );
  });
});

test("bound defaults compile one marked translation unit without a duplicate raw message", async () => {
  await _withMessages(async (root) => {
    const filename = path.join(root, "src/stock/registry/stockContracts.ts");
    let source = await fs.readFile(filename, "utf8");
    source = source
      .replace(
        'label:"Fresh English",id:"stable"',
        'label:"Fresh English",start:6,end:13,id:"stable"',
      )
      .replace(
        'defaultTextPaths:[["label"]]',
        'defaultTextPaths:[["label"]],defaultSpanBindings:[{textPath:["label"],startPath:["start"],endPath:["end"],template:"Fresh <content>English</content>"}]',
      );
    await fs.writeFile(filename, source);
    await buildStockMessages(root);
    const output = await fs.readFile(
      path.join(root, "src/stock/i18n/messages.en.generated.ts"),
      "utf8",
    );
    assert.equal(
      (output.match(/"motionAtlas.test.default.label":/g) ?? []).length,
      2,
      "One ID in compiled messages and one in source messages.",
    );
    assert.match(output, /Fresh <content>English<\/content>/);
    assert.doesNotMatch(output, /"Fresh English"/);
    const { build } = await import("esbuild"),
      { runInNewContext } = await import("node:vm"),
      { setupI18n } = await import("@lingui/core");
    const result = await build({
      entryPoints: [path.join(root, "src/stock/i18n/messages.en.generated.ts")],
      bundle: true,
      format: "cjs",
      platform: "node",
      write: false,
      logLevel: "silent",
    });
    const loaded = { exports: {} as { messages: Record<string, string> } };
    runInNewContext(result.outputFiles[0].text, {
      module: loaded,
      exports: loaded.exports,
    });
    const i18n = setupI18n({
      locale: "en",
      messages: { en: loaded.exports.messages },
    });
    assert.equal(
      i18n._("motionAtlas.test.default.label"),
      "Fresh <content>English</content>",
    );
  });
});

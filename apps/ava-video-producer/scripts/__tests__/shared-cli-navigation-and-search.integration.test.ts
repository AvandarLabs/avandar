import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
function _evaluate(source: string): unknown {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    {
      cwd: APP_ROOT,
      env: LicenseFixtures.licenseTestEnvironment("/dev/null"),
      encoding: "utf8",
      timeout: 10000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("menu movement wraps with arrows and j/k, while g/G select endpoints", () => {
  const results =
    _evaluate(`import { PromptView } from "./scripts/runProducerCommand/PromptView.mjs";
    console.log(JSON.stringify(["up", "k", "down", "j", "g", "G"].map(key => PromptView.move({index:0,length:3,key}))));`);
  assert.deepEqual(results, [2, 2, 1, 1, 0, 2]);
});

test("inventory search narrows by all case-insensitive words including group fields", () => {
  const results =
    _evaluate(`import { InventoryView } from "./scripts/runProducerCommand/InventoryView/InventoryView.mjs";
    const rows = [{id:"one",name:"School costs",group:"Finance"},{id:"two",name:"School visits",group:"Health"}];
    console.log(JSON.stringify(InventoryView.filter({rows,words:["SCHOOL","fin"]})));`);
  assert.deepEqual(results, [
    { id: "one", name: "School costs", group: "Finance" },
  ]);
});

test("explicit shell flags preserve space-containing outputs and legacy worker arguments", () => {
  const results =
    _evaluate(`import { parseCommandArguments } from "./scripts/runProducerCommand/parseCommandArguments.mjs";
    import { normalizeCommandArguments } from "./scripts/runProducerCommand/normalizeCommandArguments.mjs";
    const parsed = parseCommandArguments({commandName:"render",arguments:["114","--output-dir","out/my exports","--standalone","--keep-frames"]});
    console.log(JSON.stringify(normalizeCommandArguments({commandName:"render",parsed})));`);
  assert.deepEqual(results, {
    arguments: ["114"],
    environment: {
      AVA_PRODUCER_COMPOSITION: "demo",
      RENDER_OUT_DIR: "out/my exports",
      STANDALONE: "1",
      KEEP_RENDER_FRAMES: "1",
    },
  });
});

test("inventory pages preserve row order, selection and group data within terminal height", () => {
  const result =
    _evaluate(`import { InventoryView } from "./scripts/runProducerCommand/InventoryView/InventoryView.mjs";
    const rows = Array.from({length:5}, (_,index) => ({id:String(index),name:"Item "+index,group:"Known group"}));
    console.log(JSON.stringify(InventoryView.page({rows,index:2,pageSize:2})));`);
  assert.deepEqual(result, {
    rows: [
      { id: "2", name: "Item 2", group: "Known group" },
      { id: "3", name: "Item 3", group: "Known group" },
    ],
    index: 0,
    page: 2,
    pages: 3,
  });
});

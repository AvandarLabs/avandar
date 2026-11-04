import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import {
  buildStockContracts,
  type StockContractGeneration,
} from "./buildStockContracts";

async function _withContracts(action: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stock-contracts-"));
  try {
    await fs.mkdir(path.join(root, "src/stock/contracts/stockRequestSchema"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "src/stock/catalog.ts"),
      'import { value } from "./nested"; export const STOCK_FPS=30; export const STOCK_CATALOG=[{id:"test",loopFrames:value}];',
    );
    await fs.writeFile(
      path.join(root, "src/stock/nested.ts"),
      "export const value=180;",
    );
    await fs.writeFile(
      path.join(
        root,
        "src/stock/contracts/stockRequestSchema/stockRequestSchema.ts",
      ),
      'import { value } from "../../nested"; export const stockRequestSchema={parse: (input) => ({...input, input: value})};',
    );
    await action(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function _writeContractValue(
  options: Readonly<{ root: string; value: string | number }>,
): Promise<void> {
  return fs.writeFile(
    path.join(options.root, "src/stock/nested.ts"),
    `export const value=${options.value};`,
  );
}

function _createGate(): { pending: Promise<void>; open: () => void } {
  let open!: () => void;
  const pending = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { pending, open };
}

async function _withPendingRemoval(
  options: Readonly<{
    context: TestContext;
    filename: string;
    action: (
      control: Readonly<{ paused: Promise<void>; resume: () => void }>,
    ) => Promise<void>;
  }>,
): Promise<void> {
  const paused = _createGate();
  const resume = _createGate();
  const remove = fs.rm.bind(fs);
  let hasPaused = false;
  options.context.mock.method(
    fs,
    "rm",
    async (
      filename: Parameters<typeof fs.rm>[0],
      settings: Parameters<typeof fs.rm>[1],
    ) => {
      if (String(filename) === options.filename && !hasPaused) {
        hasPaused = true;
        paused.open();
        await resume.pending;
      }
      return remove(filename, settings);
    },
  );
  try {
    await options.action({ paused: paused.pending, resume: resume.open });
  } finally {
    resume.open();
  }
}

async function _startRebuildAtRootBoundary(
  options: Readonly<{ context: TestContext; root: string }>,
): Promise<{
  replacement: Promise<{
    generation: StockContractGeneration;
    release: () => Promise<void>;
  }>;
  hasStartedBeforeRemoval: boolean;
}> {
  const resolvedRoot = _createGate();
  const realpath = fs.realpath.bind(fs);
  const canonicalRoot = await realpath(options.root);
  let numRootLookups = 0;
  options.context.mock.method(
    fs,
    "realpath",
    async (
      filename: Parameters<typeof fs.realpath>[0],
      settings: Parameters<typeof fs.realpath>[1],
    ) => {
      const isRoot =
        String(filename) === options.root || String(filename) === canonicalRoot;
      if (isRoot) {
        numRootLookups += 1;
      }
      const result = await realpath(filename, settings);
      if (isRoot && numRootLookups === 1) {
        resolvedRoot.open();
      }
      return result;
    },
  );
  const replacement = buildStockContracts(options.root).then((generation) => ({
    generation,
    release: generation.retain(),
  }));
  await resolvedRoot.pending;
  // Drain promise continuations after the controlled root-resolution boundary.
  await new Promise((resolve) => setImmediate(resolve));
  return { replacement, hasStartedBeforeRemoval: numRootLookups > 1 };
}

test("nested contract edits create new defaults and validators without mutating retained generations", async () => {
  await _withContracts(async (root) => {
    const original = await buildStockContracts(root);
    const release = original.retain();
    assert.equal(
      original.stockRequestSchema.parse({ preset: "decision-fork" }).input,
      180,
    );
    await fs.writeFile(
      path.join(root, "src/stock/nested.ts"),
      "export const value=240;",
    );
    const current = await buildStockContracts(root);
    assert.notEqual(current.hash, original.hash);
    assert.equal(
      current.stockRequestSchema.parse({ preset: "decision-fork" }).input,
      240,
    );
    assert.equal(
      original.stockRequestSchema.parse({ preset: "decision-fork" }).input,
      180,
    );
    await fs.access(original.filename);
    await release();
    await assert.rejects(fs.access(original.filename), { code: "ENOENT" });
    await fs.access(current.filename);
  });
});

test("unchanged contracts reuse the same immutable file while outputs do not create a generation", async () => {
  await _withContracts(async (root) => {
    const original = await buildStockContracts(root);
    await fs.writeFile(
      path.join(root, "out/showcase/contracts/unrelated.txt"),
      "output",
    );
    assert.equal((await buildStockContracts(root)).filename, original.filename);
  });
});

test("concurrent generation loads share ownership so an active export survives a rebuild", async () => {
  await _withContracts(async (root) => {
    const [first, second] = await Promise.all([
      buildStockContracts(root),
      buildStockContracts(root),
    ]);
    const release = first.retain();
    assert.equal(first.filename, second.filename);
    await fs.writeFile(
      path.join(root, "src/stock/nested.ts"),
      "export const value=300;",
    );
    await buildStockContracts(root);
    await fs.access(first.filename);
    await release();
    await assert.rejects(fs.access(first.filename), { code: "ENOENT" });
  });
});

test("contract generations reject a renderer dependency before importing it", async () => {
  await _withContracts(async (root) => {
    await fs.writeFile(
      path.join(root, "src/stock/picture.tsx"),
      "export const value = <svg />;",
    );
    await fs.writeFile(
      path.join(root, "src/stock/nested.ts"),
      'export { value } from "./picture";',
    );
    await assert.rejects(buildStockContracts(root), /renderer|tsx/i);
  });
});

test("a pending release cannot delete a recreated retained generation after a source revert", async (context) => {
  await _withContracts(async (root) => {
    const original = await buildStockContracts(root);
    const releaseOriginal = original.retain();
    await _writeContractValue({ root, value: 240 });
    const changed = await buildStockContracts(root);
    await _withPendingRemoval({
      context,
      filename: original.filename,
      action: async ({ paused, resume }) => {
        const releasedOriginal = releaseOriginal();
        await paused;
        await _writeContractValue({ root, value: 180 });
        const rebuild = await _startRebuildAtRootBoundary({ context, root });
        if (rebuild.hasStartedBeforeRemoval) {
          await rebuild.replacement;
        }
        resume();
        await releasedOriginal;
        const current = await rebuild.replacement;
        try {
          assert.equal(current.generation.filename, original.filename);
          await fs.access(current.generation.filename);
          assert.deepEqual(
            [original, changed, current.generation].map(
              (generation) =>
                generation.stockRequestSchema.parse({ preset: "decision-fork" })
                  .input,
            ),
            [180, 240, 180],
          );
        } finally {
          await current.release();
        }
      },
    });
  });
});

test("a failed contract build does not block the next valid generation", async () => {
  await _withContracts(async (root) => {
    const original = await buildStockContracts(root);
    await _writeContractValue({ root, value: "" });
    await assert.rejects(buildStockContracts(root));
    await _writeContractValue({ root, value: 240 });
    const current = await buildStockContracts(root);
    assert.equal(
      current.stockRequestSchema.parse({ preset: "decision-fork" }).input,
      240,
    );
    assert.equal(
      original.stockRequestSchema.parse({ preset: "decision-fork" }).input,
      180,
    );
    await fs.access(current.filename);
  });
});

test("releasing one reference twice preserves another active generation owner", async () => {
  await _withContracts(async (root) => {
    const original = await buildStockContracts(root);
    const releaseFirst = original.retain();
    const releaseSecond = original.retain();
    await _writeContractValue({ root, value: 240 });
    await buildStockContracts(root);
    await Promise.all([releaseFirst(), releaseFirst()]);
    await fs.access(original.filename);
    await releaseSecond();
    await assert.rejects(fs.access(original.filename), { code: "ENOENT" });
  });
});

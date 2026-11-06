import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DECISION_FORK_DENSE_INPUT } from "../../../src/stock/presets/DecisionFork/DecisionFork.fixtures";
import { StockFingerprintModule } from "../../stock/StockFingerprintModule/StockFingerprintModule";
import { ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { createExportJobs } from "./createExportJobs";

test("only one render runs and repeated clicks reuse the active job", async () => {
  let finish!: (value: string) => void;
  const jobs = createExportJobs(
    async () =>
      await new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const first = jobs.start("same", {});
  assert.equal(jobs.start("same", {}).id, first.id);
  assert.throws(() => jobs.start("different", {}), /already rendering/);
  finish("/tmp/film.mp4");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(jobs.get(first.id)?.state, "complete");
  assert.equal(
    jobs.get(first.id)?.download,
    `/api/exports/${first.id}/download`,
  );
});

test("failed render never exposes a downloadable file and allows retry", async (context) => {
  context.mock.method(console, "error", () => {});
  const jobs = createExportJobs(async () => {
    throw new Error("/Users/private/path: Gate failed");
  });
  const first = jobs.start("film", {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(jobs.get(first.id)?.state, "failed");
  assert.doesNotMatch(jobs.get(first.id)?.message ?? "", /Users|private/);
  assert.equal(jobs.get(first.id)?.download, undefined);
  assert.equal(jobs.file(first.id), undefined);
  assert.notEqual(jobs.start("film", {}).id, first.id);
});

test("different stock content cannot reuse an active export while equivalent requests coalesce", async () => {
  const film = await ShowcaseFilms.load("stock-decision-fork");
  const denseFilm = await ShowcaseFilms.load("stock-decision-fork", {
    input: DECISION_FORK_DENSE_INPUT,
  });
  const { appRoot } = await import("../ShowcaseFilms/ShowcaseFilms");
  const original = await StockFingerprintModule.fromRequest({
    root: appRoot,
    request: film,
  });
  const equivalent = await StockFingerprintModule.fromRequest({
    root: appRoot,
    request: Object.fromEntries(Object.entries(film).reverse()),
  });
  const dense = await StockFingerprintModule.fromRequest({
    root: appRoot,
    request: denseFilm,
  });
  let finish!: (filename: string) => void;
  const jobs = createExportJobs(
    async ({ input: snapshot }: Readonly<{ input: typeof film }>) => {
      const release = ShowcaseFilms.retainContracts(snapshot);
      try {
        assert.ok(Object.isFrozen(snapshot.input));
        return await new Promise<string>((resolve) => {
          finish = resolve;
        });
      } finally {
        await release();
      }
    },
  );
  const active = jobs.start(original.configurationHash, film);
  assert.equal(jobs.start(equivalent.configurationHash, film).id, active.id);
  assert.throws(
    () => jobs.start(dense.configurationHash, denseFilm),
    /already rendering/,
  );
  finish("/tmp/completed-stock.mp4");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(jobs.file(active.id), "/tmp/completed-stock.mp4");
});

test("a source edit during an active stock job prevents a downloadable completed file", async (context) => {
  context.mock.method(console, "error", () => {});
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stock-job-"));
  try {
    await fs.mkdir(path.join(root, "src/stock/presets/Nested"), {
      recursive: true,
    });
    const source = path.join(root, "src/stock/presets/Nested/input.ts");
    await fs.writeFile(source, "export const value = 1;");
    const fingerprint = await StockFingerprintModule.fromRequest({
      root,
      request: {
        preset: "test",
        input: [1],
      },
    });
    let finish!: () => void;
    let settle!: () => void;
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const jobs = createExportJobs(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      try {
        await StockFingerprintModule.verifySources({
          root,
          sourceHash: fingerprint.sourceHash,
        });
        return "/tmp/stale-stock.mp4";
      } finally {
        settle();
      }
    });
    const active = jobs.start(fingerprint.configurationHash, {});
    await fs.writeFile(source, "export const value = 2;");
    finish();
    await settled;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(jobs.get(active.id)?.state, "failed");
    assert.equal(jobs.file(active.id), undefined);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

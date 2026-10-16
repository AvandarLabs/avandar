import assert from "node:assert/strict";
import test from "node:test";
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

test("failed render never exposes a downloadable file and allows retry", async () => {
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

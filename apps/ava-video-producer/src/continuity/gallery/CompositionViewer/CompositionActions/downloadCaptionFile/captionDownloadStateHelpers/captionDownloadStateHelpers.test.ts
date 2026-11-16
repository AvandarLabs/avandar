import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTION_DOWNLOAD_IDLE,
  finishCaptionDownload,
  startCaptionDownload,
} from "./captionDownloadStateHelpers";

test("starting a caption download marks it busy and clears a stale failure", () => {
  assert.deepEqual(startCaptionDownload({ failedId: "intro" }, "intro"), {
    busyId: "intro",
  });
});

test("a caption download already in flight cannot start again", () => {
  assert.equal(startCaptionDownload({ busyId: "intro" }, "intro"), undefined);
});

test("a finished caption download is idle, or failed for its film", () => {
  const busy = { busyId: "intro" };
  assert.deepEqual(
    finishCaptionDownload(busy, { id: "intro", hasFailed: false }),
    CAPTION_DOWNLOAD_IDLE,
  );
  assert.deepEqual(
    finishCaptionDownload(busy, { id: "intro", hasFailed: true }),
    { failedId: "intro" },
  );
});

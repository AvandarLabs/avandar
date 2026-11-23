import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTION_DOWNLOAD_IDLE,
  CaptionDownloadState,
} from "./CaptionDownloadState";

test("starting a caption download marks it busy and clears a stale failure", () => {
  assert.deepEqual(
    CaptionDownloadState.startCaptionDownload({
      state: { failedId: "intro" },
      id: "intro",
    }),
    {
      busyId: "intro",
    },
  );
});
test("a caption download already in flight cannot start again", () => {
  assert.equal(
    CaptionDownloadState.startCaptionDownload({
      state: { busyId: "intro" },
      id: "intro",
    }),
    undefined,
  );
});
test("a finished caption download is idle, or failed for its film", () => {
  const busy = { busyId: "intro" };
  assert.deepEqual(
    CaptionDownloadState.finishCaptionDownload({
      state: busy,
      options: { id: "intro", hasFailed: false },
    }),
    CAPTION_DOWNLOAD_IDLE,
  );
  assert.deepEqual(
    CaptionDownloadState.finishCaptionDownload({
      state: busy,
      options: { id: "intro", hasFailed: true },
    }),
    { failedId: "intro" },
  );
});

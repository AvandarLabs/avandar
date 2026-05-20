import { describe, expect, it } from "vitest";
import {
  applyTransformersProgressEvent,
  createDownloadingStatus,
  downloadingStatusFromDesktopSnapshot,
  overallDownloadPercent,
} from "./voiceDownloadProgress";

describe("voiceDownloadProgress", () => {
  it("tracks multiple files and keeps completed rows when the next file starts", () => {
    let status = createDownloadingStatus("whisper-tiny");

    status = applyTransformersProgressEvent(status, {
      status: "progress",
      file: "model.onnx",
      progress: 100,
    });
    status = applyTransformersProgressEvent(status, {
      status: "done",
      file: "model.onnx",
    });
    status = applyTransformersProgressEvent(status, {
      status: "download",
      file: "tokenizer.json",
    });
    status = applyTransformersProgressEvent(status, {
      status: "progress",
      file: "tokenizer.json",
      progress: 40,
    });

    expect(status.files).toHaveLength(2);
    expect(status.files[0]).toMatchObject({
      fileName: "model.onnx",
      progressPercent: 100,
      state: "complete",
    });
    expect(status.files[1]).toMatchObject({
      fileName: "tokenizer.json",
      progressPercent: 40,
      state: "downloading",
    });
    expect(status.phase).toBe("files");
  });

  it("enters the loading phase when every asset file is complete", () => {
    let status = createDownloadingStatus("whisper-tiny");
    status = applyTransformersProgressEvent(status, {
      status: "done",
      file: "model.onnx",
    });
    status = applyTransformersProgressEvent(status, {
      status: "done",
      file: "tokenizer.json",
    });

    expect(status.phase).toBe("loading");
    expect(
      status.files.some((file) => {
        return file.fileName === "Loading into memory…";
      }),
    ).toBe(true);
  });

  it("computes overall percent as the mean of asset file percents", () => {
    const percent = overallDownloadPercent([
      { fileName: "a", progressPercent: 100, state: "complete" },
      { fileName: "b", progressPercent: 50, state: "downloading" },
    ]);
    expect(percent).toBe(75);
  });

  it("maps desktop snapshots into a single file row", () => {
    const status = downloadingStatusFromDesktopSnapshot(
      "whisper-base",
      42,
      "ggml-base.bin",
      { kind: "idle" },
    );

    expect(status.files).toEqual([
      {
        fileName: "ggml-base.bin",
        progressPercent: 42,
        state: "downloading",
      },
    ]);
  });
});

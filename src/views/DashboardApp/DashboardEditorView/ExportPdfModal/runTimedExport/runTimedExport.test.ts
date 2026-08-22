import { describe, expect, it, vi } from "vitest";

import { runTimedExport } from "@/views/DashboardApp/DashboardEditorView/ExportPdfModal/runTimedExport/runTimedExport";

describe("runTimedExport", () => {
  it("reports the elapsed duration once a successful export settles", async () => {
    vi.useFakeTimers({ toFake: ["performance"] });
    try {
      const onExported = vi.fn();
      const runExport = vi.fn(async () => {
        vi.advanceTimersByTime(120);
      });

      await runTimedExport({ runExport, onExported });

      expect(onExported).toHaveBeenCalledTimes(1);
      expect(onExported).toHaveBeenCalledWith(120);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports nothing and lets the rejection propagate when the export fails", async () => {
    const onExported = vi.fn();
    const failure = new Error("export failed");
    const runExport = vi.fn(async () => {
      throw failure;
    });

    await expect(runTimedExport({ runExport, onExported })).rejects.toBe(
      failure,
    );
    expect(onExported).not.toHaveBeenCalled();
  });
});

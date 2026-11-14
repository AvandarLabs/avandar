import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMBINED_PREVIEW_MEASURE,
  startCombinedPreviewTiming,
} from "@/lib/crosswalks/combinedPreviewTiming/combinedPreviewTiming";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { logMock } = vi.hoisted(() => {
  return { logMock: vi.fn() };
});

vi.mock("@/utils/Logger", () => {
  return { Logger: { log: logMock } };
});

const KINGS = "d0000000-0000-4000-8000-000000000001" as Dataset.Id;
const QUEENS = "d0000000-0000-4000-8000-000000000002" as Dataset.Id;
const NESTED = "d0000000-0000-4000-8000-000000000009" as Dataset.Id;

let nowMs = 0;
const performanceStub = {
  now: () => {
    return nowMs;
  },
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  nowMs = 1_000;
  vi.stubGlobal("performance", performanceStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startCombinedPreviewTiming", () => {
  it("measures the run, the time spent reading, and how many stacked datasets were read", () => {
    const timing = startCombinedPreviewTiming();
    nowMs = 4_000;
    timing.onRelationFetched(KINGS);
    nowMs = 9_000;
    timing.onRelationFetched(NESTED);
    nowMs = 10_000;
    timing.onRelationFetched(KINGS);
    nowMs = 12_500;

    timing.finish({ datasetIds: [KINGS, QUEENS] });

    const startMark = performanceStub.mark.mock.calls[0]?.[0] as string;
    expect(startMark).toMatch(/^crosswalks:combined-preview:start:/);
    expect(performanceStub.measure).toHaveBeenCalledWith(
      COMBINED_PREVIEW_MEASURE,
      {
        start: startMark,
        detail: { datasetCount: 2, readCount: 1, readingMs: 9_000 },
      },
    );
    expect(performanceStub.clearMarks).toHaveBeenCalledWith(startMark);
    expect(logMock).toHaveBeenCalledWith("[crosswalks] Combined preview", {
      totalMs: 11_500,
      datasetCount: 2,
      readCount: 1,
      readingMs: 9_000,
    });
  });

  it("counts no reading time when every dataset was already in hand", () => {
    const timing = startCombinedPreviewTiming();
    nowMs = 1_200;

    timing.finish({ datasetIds: [KINGS] });

    expect(performanceStub.measure).toHaveBeenCalledWith(
      COMBINED_PREVIEW_MEASURE,
      expect.objectContaining({
        detail: { datasetCount: 1, readCount: 0, readingMs: 0 },
      }),
    );
  });
});

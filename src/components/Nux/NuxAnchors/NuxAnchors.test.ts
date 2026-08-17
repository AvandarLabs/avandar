import { describe, expect, it } from "vitest";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

describe("nuxAnchors", () => {
  it("builds a data attribute selector", () => {
    expect(NuxAnchors.selector(NuxAnchors.ids.datasetUploadForm)).toBe(
      '[data-nux="dataset-upload-form"]',
    );
  });

  it("spreads onto a component as a data attribute", () => {
    expect(NuxAnchors.props(NuxAnchors.ids.datasetSummary)).toEqual({
      "data-nux": "dataset-summary",
    });
  });

  it("keeps every anchor value unique", () => {
    const values = Object.values(NuxAnchors.ids);
    expect(new Set(values).size).toBe(values.length);
  });
});

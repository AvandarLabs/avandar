import { describe, expect, it } from "vitest";
import {
  nuxAnchorProps,
  NuxAnchors,
  nuxAnchorSelector,
} from "@/components/Nux/nuxAnchors";

describe("nuxAnchors", () => {
  it("builds a data attribute selector", () => {
    expect(nuxAnchorSelector(NuxAnchors.datasetUploadForm)).toBe(
      '[data-nux="dataset-upload-form"]',
    );
  });

  it("spreads onto a component as a data attribute", () => {
    expect(nuxAnchorProps(NuxAnchors.datasetSummary)).toEqual({
      "data-nux": "dataset-summary",
    });
  });

  it("keeps every anchor value unique", () => {
    const values = Object.values(NuxAnchors);
    expect(new Set(values).size).toBe(values.length);
  });
});

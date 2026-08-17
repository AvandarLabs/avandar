import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/DatasetSource";
import { describe, expect, it } from "vitest";
import { getDatasetSourceTypeFromSourceFileType } from "@/models/LocalDataset/localDatasetSourceFileType";

describe("getDatasetSourceTypeFromSourceFileType", () => {
  it("maps every locally-cached file kind to its source type", () => {
    expect(getDatasetSourceTypeFromSourceFileType("csv")).toBe("csv_file");
    expect(getDatasetSourceTypeFromSourceFileType("xlsx")).toBe("xlsx_file");
    expect(getDatasetSourceTypeFromSourceFileType("pdf")).toBe("pdf_file");
  });

  it("lets the pin be derived from a row's own sourceFileType", () => {
    // This composition is what `_putParsingDataset` writes into
    // `isSourcePinned`, instead of hardcoding it: pinned if and only if the
    // source type's original cannot be reconstructed.
    expect(
      requiresOriginalFileRetention(
        getDatasetSourceTypeFromSourceFileType("pdf"),
      ),
    ).toBe(true);
    expect(
      requiresOriginalFileRetention(
        getDatasetSourceTypeFromSourceFileType("csv"),
      ),
    ).toBe(false);
    expect(
      requiresOriginalFileRetention(
        getDatasetSourceTypeFromSourceFileType("xlsx"),
      ),
    ).toBe(false);
  });
});

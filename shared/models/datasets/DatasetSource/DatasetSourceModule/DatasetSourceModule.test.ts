import { describe, expect, it } from "vitest";
import { DatasetSourceModule } from "$/models/datasets/DatasetSource/DatasetSourceModule/DatasetSourceModule.ts";
import type { DatasetSourceType } from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

describe("DatasetSourceModule.supportsImportTimeColumnEditing", () => {
  it("allows editing for the sources whose columns we inferred ourselves", () => {
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing("csv_file"),
    ).toBe(true);
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing("xlsx_file"),
    ).toBe(true);
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing("google_sheets"),
    ).toBe(true);
  });

  it("refuses editing for open data, whose column metadata the catalog owns", () => {
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing("open_data"),
    ).toBe(false);
  });

  it("refuses editing for virtual datasets, whose columns their SQL decides", () => {
    expect(DatasetSourceModule.supportsImportTimeColumnEditing("virtual")).toBe(
      false,
    );
  });

  it("reads the source type off a metadata object as well as a bare string", () => {
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing({
        sourceType: "csv_file",
      }),
    ).toBe(true);
    expect(
      DatasetSourceModule.supportsImportTimeColumnEditing({
        sourceType: "open_data",
      }),
    ).toBe(false);
  });

  // The predicate matches exhaustively, so an unhandled source type throws
  // rather than defaulting. This is what makes adding a source type without
  // deciding its answer a failure instead of a silent `false`.
  it("throws rather than guessing for a source type it does not handle", () => {
    expect(() => {
      return DatasetSourceModule.supportsImportTimeColumnEditing(
        "pdf_file" as DatasetSourceType,
      );
    }).toThrow();
  });

  it("has an answer for every source type in the registry", () => {
    DatasetSourceModule.SourceTypes.forEach((sourceType) => {
      expect(() => {
        return DatasetSourceModule.supportsImportTimeColumnEditing(sourceType);
      }).not.toThrow();
    });
  });
});

import { describe, expect, it } from "vitest";
import { makeDatasetColumnInputsFromImportedColumns } from "./makeDatasetColumnInputsFromImportedColumns";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

function _importedColumn(
  overrides: Partial<DatasetColumn.Imported> = {},
): DatasetColumn.Imported {
  return {
    originalName: "city",
    name: "city",
    originalDataType: "VARCHAR",
    detectedDataType: "VARCHAR",
    dataType: "varchar",
    isDataTypeUserSet: false,
    columnIdx: 0,
    ...overrides,
  };
}

describe("makeDatasetColumnInputsFromImportedColumns", () => {
  it("keeps the source name alongside a renamed column", () => {
    const [input] = makeDatasetColumnInputsFromImportedColumns([
      _importedColumn({ originalName: "cty", name: "City" }),
    ]);

    expect(input?.original_name).toBe("cty");
    expect(input?.name).toBe("City");
  });

  it("carries a user-set type through as the override flag", () => {
    const [overridden, inferred] = makeDatasetColumnInputsFromImportedColumns([
      _importedColumn({ dataType: "date", isDataTypeUserSet: true }),
      _importedColumn({ dataType: "varchar", isDataTypeUserSet: false }),
    ]);

    expect(overridden?.is_data_type_user_set).toBe(true);
    expect(overridden?.data_type).toBe("date");
    expect(inferred?.is_data_type_user_set).toBe(false);
  });

  it("leaves an absent description absent rather than sending an empty string", () => {
    const [withoutDescription, withDescription] =
      makeDatasetColumnInputsFromImportedColumns([
        _importedColumn(),
        _importedColumn({ description: "Where the reading was taken" }),
      ]);

    expect(withoutDescription?.description).toBeUndefined();
    expect(withDescription?.description).toBe("Where the reading was taken");
  });

  it("preserves each column's own index rather than its list position", () => {
    const inputs = makeDatasetColumnInputsFromImportedColumns([
      _importedColumn({ name: "second", columnIdx: 1 }),
      _importedColumn({ name: "first", columnIdx: 0 }),
    ]);

    expect(
      inputs.map((input) => {
        return [input.name, input.column_idx];
      }),
    ).toEqual([
      ["second", 1],
      ["first", 0],
    ]);
  });

  it("does not send the detected type as the queryable type", () => {
    const [input] = makeDatasetColumnInputsFromImportedColumns([
      _importedColumn({
        detectedDataType: "BIGINT",
        dataType: "varchar",
        isDataTypeUserSet: true,
      }),
    ]);

    expect(input?.detected_data_type).toBe("BIGINT");
    expect(input?.data_type).toBe("varchar");
  });
});

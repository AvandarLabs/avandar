import hdxCoverageDate from "@pipelines/hdx/mappers/hdxCoverageDate/hdxCoverageDate";
import { describe, expect, it } from "vitest";

const DRIVE_KEY = "https://data.humdata.org";

function _mapBoth(datasetDate: unknown): readonly unknown[] {
  const record = { dataset_date: datasetDate };
  return [
    hdxCoverageDate(record, {
      driveKey: DRIVE_KEY,
      field: "coverage_start_date",
    }),
    hdxCoverageDate(record, {
      driveKey: DRIVE_KEY,
      field: "coverage_end_date",
    }),
  ];
}

describe("hdxCoverageDate", () => {
  it("reads each end of the package's date range as UTC", () => {
    expect(_mapBoth("[1974-01-01T00:00:00 TO 2023-12-31T23:59:59]")).toEqual([
      "1974-01-01T00:00:00Z",
      "2023-12-31T23:59:59Z",
    ]);
  });

  it("leaves an open end of the range empty", () => {
    expect(_mapBoth("[2022-01-01T00:00:00 TO *]")).toEqual([
      "2022-01-01T00:00:00Z",
      undefined,
    ]);
  });

  it("leaves both ends empty when the date is not a range", () => {
    expect([_mapBoth("2022-01-01"), _mapBoth(""), _mapBoth(undefined)]).toEqual(
      [
        [undefined, undefined],
        [undefined, undefined],
        [undefined, undefined],
      ],
    );
  });

  it("fills no field other than the coverage dates", () => {
    expect(
      hdxCoverageDate(
        { dataset_date: "[2022-01-01T00:00:00 TO 2023-01-01T00:00:00]" },
        { driveKey: DRIVE_KEY, field: "notes" },
      ),
    ).toBeUndefined();
  });
});

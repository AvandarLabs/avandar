import { describe, expect, it } from "vitest";
import { toColumnsInTableOrder } from "@/views/DataManagerApp/DatasetMetaView/toColumnsInTableOrder/toColumnsInTableOrder";

describe("toColumnsInTableOrder", () => {
  it("orders columns by their index, not the order they were read in", () => {
    // Postgres returns an updated row last, as after a conversion in place.
    const columns = [
      { name: "case_id", columnIdx: 0 },
      { name: "county", columnIdx: 2 },
      { name: "GENDER", columnIdx: 1 },
    ];

    expect(
      toColumnsInTableOrder(columns)?.map((column) => {
        return column.name;
      }),
    ).toEqual(["case_id", "GENDER", "county"]);
  });

  it("returns undefined while the columns are loading", () => {
    expect(toColumnsInTableOrder(undefined)).toBeUndefined();
  });
});

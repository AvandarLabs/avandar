import { describe, expect, it } from "vitest";
import { truncateSchemaForOffline } from "./truncateSchemaForOffline";

describe("truncateSchemaForOffline", () => {
  it("keeps dataset labels when there are no columns yet", () => {
    const schema = {
      datasets: [
        { id: "id-deaths", name: "LONG_us_deaths.csv" },
        { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
      ],
      columns: [],
    };

    const truncated = truncateSchemaForOffline(schema);

    expect(truncated.datasets).toHaveLength(2);
    expect(truncated.columns).toHaveLength(0);
  });
});

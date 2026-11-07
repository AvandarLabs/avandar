import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { dashboardBlockToExplorerResponse } from "./dashboardBlockToExplorerResponse";

const SQL = 'SELECT "date", SUM("deaths") FROM "abc" GROUP BY 1';

describe("dashboardBlockToExplorerResponse", () => {
  it("turns a chart block into SQL for the explorer and the chart type to show", () => {
    const converted = dashboardBlockToExplorerResponse(
      Model.make("ChatResponse", {
        assistantText: "Monthly US deaths over the whole period.",
        dashboardBlock: {
          kind: "DataViz",
          prompt: "US deaths over time",
          sql: SQL,
          vizType: "line",
        },
      }),
    );

    expect(converted).toEqual({
      kind: "chart",
      vizType: "line",
      response: Model.make("ChatResponse", {
        assistantText: "Monthly US deaths over the whole period.",
        generatedSql: { sql: SQL, prompt: "US deaths over time" },
      }),
    });
  });

  it("flags a non-chart block, which only a dashboard can hold", () => {
    expect(
      dashboardBlockToExplorerResponse(
        Model.make("ChatResponse", {
          assistantText: "Added a heading to your dashboard.",
          dashboardBlock: { kind: "HeadingBlock", text: "COVID in the US" },
        }),
      ).kind,
    ).toBe("dashboard_only");
  });

  it("leaves a response without a dashboard block as it is", () => {
    const response = Model.make("ChatResponse", {
      assistantText: "",
      generatedSql: { sql: SQL, prompt: "deaths" },
    });
    expect(dashboardBlockToExplorerResponse(response)).toEqual({
      kind: "unchanged",
      response,
    });
  });
});

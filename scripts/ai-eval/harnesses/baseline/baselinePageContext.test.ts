import { describe, expect, it } from "vitest";
import {
  getBaselineBlockOutcome,
  toBaselinePageContext,
} from "./baselinePageContext";
import type { EvalQuestion } from "../../EvalQuestion";

const DASHBOARD_ID = "5c1d0a10-0d01-4000-8000-000000000001";

function _question(overrides: Partial<EvalQuestion>): EvalQuestion {
  return {
    id: "D00",
    category: "dashboards",
    prompt: "add a chart",
    clarification: "not_needed",
    truth: {},
    grade: () => {
      return { pass: false, detail: "unused" };
    },
    ...overrides,
  };
}

describe("toBaselinePageContext", () => {
  it("names the open editor's dashboard", () => {
    const context = toBaselinePageContext(
      _question({
        pageContext: {
          app: "dashboard",
          dashboard: { id: DASHBOARD_ID, name: "COVID 2022", tiles: [] },
        },
        openEditorDashboardId: DASHBOARD_ID,
      }),
    );

    expect(context).toEqual({ app: "dashboards", dashboardId: DASHBOARD_ID });
  });

  it("sends a dashboard question on another page as other", () => {
    const context = toBaselinePageContext(
      _question({ pageContext: { app: "map" } }),
    );

    expect(context).toEqual({ app: "other" });
  });

  it("sends the Data Explorer's dataset and query", () => {
    const context = toBaselinePageContext(
      _question({
        pageContext: {
          app: "data-explorer",
          dataset: { id: "ds-1", name: "Deaths" },
          explorer: {
            sql: "SELECT 1",
            resultColumns: [{ name: "x", dataType: "bigint" }],
          },
        },
      }),
    );

    expect(context).toEqual({
      app: "data-explorer",
      openDatasetId: "ds-1",
      lastSql: "SELECT 1",
      lastResultColumns: [{ name: "x", dataType: "bigint" }],
    });
  });

  it("leaves other questions' context as the conversation built it", () => {
    const context = toBaselinePageContext(
      _question({ category: "page_context", pageContext: { app: "map" } }),
    );

    expect(context).toBeUndefined();
  });
});

describe("getBaselineBlockOutcome", () => {
  const chart = {
    kind: "DataViz" as const,
    prompt: "Deaths",
    sql: "SELECT 1",
    vizType: "line" as const,
  };
  const heading = { kind: "HeadingBlock" as const, text: "Deaths" };

  it("adds any block to the open editor's dashboard", () => {
    const context = { app: "dashboards", dashboardId: DASHBOARD_ID } as const;

    expect(getBaselineBlockOutcome(context, heading)).toEqual({
      kind: "editor_write",
      dashboardId: DASHBOARD_ID,
    });
  });

  it("runs a chart block in the Data Explorer", () => {
    expect(getBaselineBlockOutcome({ app: "data-explorer" }, chart)).toEqual({
      kind: "explorer_chart",
    });
  });

  it("answers a text block in the Data Explorer with the dashboard-only reply", () => {
    expect(getBaselineBlockOutcome({ app: "data-explorer" }, heading)).toEqual({
      kind: "dashboard_only",
    });
  });

  it("drops a block on any page without an open editor", () => {
    expect(getBaselineBlockOutcome({ app: "other" }, chart)).toEqual({
      kind: "dropped",
    });
    expect(getBaselineBlockOutcome({ app: "dashboards" }, chart)).toEqual({
      kind: "dropped",
    });
  });
});

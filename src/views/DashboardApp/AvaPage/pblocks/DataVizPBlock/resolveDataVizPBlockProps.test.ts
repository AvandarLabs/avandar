import { describe, expect, it } from "vitest";
import { resolveDataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps";
import type { DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";

describe("resolveDataVizPBlockProps", () => {
  it("converts vizConfig to match the new vizType when vizType changes", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "bar",
        vizConfig: { vizType: "table" },
      },
      changed: { vizType: true },
    });
    expect(next.vizType).toBe("bar");
    expect(next.vizConfig.vizType).toBe("bar");
  });

  it("converts vizConfig from one chart type to another", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "line",
        vizConfig: {
          vizType: "bar",
          xAxisKey: "category",
          series: [{ renderAs: "bar", key: "value" }],
          layout: "group",
          withLegend: true,
        },
      },
      changed: { vizType: true },
    });
    expect(next.vizConfig.vizType).toBe("line");
  });

  it("syncs vizType from vizConfig when vizConfig changes type but vizType has not caught up", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "table",
        vizConfig: {
          vizType: "pie",
          nameKey: undefined,
          valueKey: undefined,
          isDonut: false,
          withLabels: true,
          labelsType: "value",
        },
      },
      changed: { vizConfig: true },
    });
    expect(next.vizType).toBe("pie");
    expect(next.vizConfig.vizType).toBe("pie");
  });

  it("fills in missing vizType and vizConfig with defaults", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
      },
      changed: {},
    });
    expect(next.vizType).toBe("table");
    expect(next.vizConfig).toEqual({ vizType: "table" });
  });

  it("fills in missing nlQuery with empty defaults", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        vizType: "table",
        vizConfig: { vizType: "table" },
      },
      changed: {},
    });
    expect(next.nlQuery).toEqual({
      prompt: "",
      rawSql: "",
      generations: [],
    });
  });

  it("leaves props untouched when nothing relevant has changed", () => {
    const props: DataVizPBlockProps = {
      nlQuery: { prompt: "p", rawSql: "s", generations: [] },
      vizType: "bar",
      vizConfig: {
        vizType: "bar",
        xAxisKey: "category",
        series: [{ renderAs: "bar", key: "value" }],
        layout: "group",
        withLegend: true,
      },
    };
    const next = resolveDataVizPBlockProps({ props, changed: {} });
    expect(next).toEqual(props);
  });

  it("preserves axis keys present in both types when converting bar→line", () => {
    const next = resolveDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "line",
        vizConfig: {
          vizType: "bar",
          xAxisKey: "category",
          series: [{ renderAs: "bar", key: "value" }],
          layout: "group",
          withLegend: true,
        },
      },
      changed: { vizType: true },
    });
    expect(next.vizConfig.vizType).toBe("line");
    if (next.vizConfig.vizType === "line") {
      expect(next.vizConfig.xAxisKey).toBe("category");
      expect(next.vizConfig.series[0]?.key).toBe("value");
      expect(next.vizConfig.series[0]?.renderAs).toBe("line");
    }
  });
});

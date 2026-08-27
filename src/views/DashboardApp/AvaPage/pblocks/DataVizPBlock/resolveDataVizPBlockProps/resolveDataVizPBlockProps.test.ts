import { describe, expect, it } from "vitest";
import { resolveDataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps/resolveDataVizPBlockProps";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizConfigMemory } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps/resolveDataVizPBlockProps";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";

type ResolveInput = Parameters<typeof resolveDataVizPBlockProps>[0];

/**
 * Resolve with a single block and empty memory, returning just the props.
 * Memory behavior has its own describe block below.
 */
function _getProps(
  input: Omit<ResolveInput, "blockId" | "vizConfigMemory">,
): DataVizPBlockProps {
  return resolveDataVizPBlockProps({
    ...input,
    blockId: "block-1",
    vizConfigMemory: {},
  }).props;
}

const STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "category",
  series: [{ renderAs: "bar", key: "value" }],
  layout: "stack",
  withLegend: false,
  chartStyle: { legend: { position: "left" }, grid: { color: "#e0e0e0" } },
};

describe("resolveDataVizPBlockProps", () => {
  it("converts vizConfig to match the new vizType when vizType changes", () => {
    const next = _getProps({
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
    const next = _getProps({
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
    const next = _getProps({
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
    const next = _getProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
      },
      changed: {},
    });
    expect(next.vizType).toBe("table");
    expect(next.vizConfig).toEqual({ vizType: "table" });
  });

  it("fills in missing nlQuery with empty defaults", () => {
    const next = _getProps({
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
      globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
      localFilters: [],
    };
    const next = _getProps({ props, changed: {} });
    expect(next).toEqual(props);
  });

  it("preserves axis keys present in both types when converting bar→line", () => {
    const next = _getProps({
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

  it("does not rewrite persisted props on Puck's load pass", () => {
    const props: Partial<DataVizPBlockProps> = {
      nlQuery: { prompt: "p", rawSql: "s", generations: [] },
      vizType: "table",
      vizConfig: { vizType: "table" },
    };
    const next = _getProps({
      props,
      changed: { vizType: true, vizConfig: true, nlQuery: true },
      trigger: "load",
    });
    expect(next).toBe(props);
    expect(next).not.toHaveProperty("globalFilterSubscription");
    expect(next).not.toHaveProperty("localFilters");
  });

  it("does not convert vizConfig on load even when vizType disagrees", () => {
    const props: Partial<DataVizPBlockProps> = {
      nlQuery: { prompt: "", rawSql: "", generations: [] },
      vizType: "bar",
      vizConfig: { vizType: "table" },
    };
    const next = _getProps({
      props,
      changed: { vizType: true },
      trigger: "load",
    });
    expect(next.vizConfig).toEqual({ vizType: "table" });
    expect(next.vizType).toBe("bar");
  });
});

describe("resolveDataVizPBlockProps viz config memory", () => {
  it("keeps each block's memory separate", () => {
    // Puck registers one ComponentConfig per component type, so a single
    // resolveData closure serves every DataViz block on the page. With a
    // single block this passes either way; with two it is the whole test.
    const afterBlockOne = resolveDataVizPBlockProps({
      props: {
        vizType: "pie",
        vizConfig: STYLED_BAR_CONFIG,
      },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });

    const otherBarConfig: BarChartVizConfig = {
      ...STYLED_BAR_CONFIG,
      xAxisKey: "other-category",
    };
    const afterBlockTwo = resolveDataVizPBlockProps({
      props: {
        vizType: "pie",
        vizConfig: otherBarConfig,
      },
      changed: { vizType: true },
      blockId: "block-2",
      vizConfigMemory: afterBlockOne.vizConfigMemory,
    });

    expect(afterBlockTwo.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
    expect(afterBlockTwo.vizConfigMemory["block-2"]?.bar).toStrictEqual(
      otherBarConfig,
    );

    // Block one switching back must restore its own config, not block two's.
    const restored = resolveDataVizPBlockProps({
      props: {
        vizType: "bar",
        vizConfig: afterBlockOne.props.vizConfig,
      },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: afterBlockTwo.vizConfigMemory,
    });
    expect(restored.props.vizConfig).toStrictEqual(STYLED_BAR_CONFIG);
  });

  it("restores styling a pie config cannot carry on a bar -> pie -> bar trip", () => {
    const toPie = resolveDataVizPBlockProps({
      props: { vizType: "pie", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });
    expect(toPie.props.vizConfig).not.toHaveProperty("chartStyle");

    const backToBar = resolveDataVizPBlockProps({
      props: { vizType: "bar", vizConfig: toPie.props.vizConfig },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: toPie.vizConfigMemory,
    });
    expect(backToBar.props.vizConfig).toStrictEqual(STYLED_BAR_CONFIG);
  });

  it("converts when the target type has no memory", () => {
    const next = resolveDataVizPBlockProps({
      props: { vizType: "line", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });

    expect(next.props.vizConfig.vizType).toBe("line");
    expect(next.props.vizConfig).toMatchObject({
      xAxisKey: "category",
      withLegend: false,
    });
  });

  it("records the outgoing config keyed by its own viz type", () => {
    const next = resolveDataVizPBlockProps({
      props: { vizType: "pie", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });

    expect(next.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
    expect(next.vizConfigMemory["block-1"]?.pie).toBeUndefined();
  });

  it("writes no memory on Puck's load pass", () => {
    const existing: DataVizConfigMemory = {
      "block-1": { bar: STYLED_BAR_CONFIG },
    };
    const next = resolveDataVizPBlockProps({
      props: { vizType: "bar", vizConfig: { vizType: "table" } },
      changed: { vizType: true },
      trigger: "load",
      blockId: "block-1",
      vizConfigMemory: existing,
    });

    expect(next.vizConfigMemory).toBe(existing);
    expect(next.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
  });

  it("leaves memory untouched when only vizConfig changed", () => {
    const existing: DataVizConfigMemory = {
      "block-1": { bar: STYLED_BAR_CONFIG },
    };
    const next = resolveDataVizPBlockProps({
      props: {
        vizType: "table",
        vizConfig: STYLED_BAR_CONFIG,
      },
      changed: { vizConfig: true },
      blockId: "block-1",
      vizConfigMemory: existing,
    });

    expect(next.props.vizType).toBe("bar");
    expect(next.vizConfigMemory).toBe(existing);
    expect(next.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
  });
});

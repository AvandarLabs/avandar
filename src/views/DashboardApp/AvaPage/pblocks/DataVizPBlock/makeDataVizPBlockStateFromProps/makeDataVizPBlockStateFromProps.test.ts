import { describe, expect, it } from "vitest";
import { makeDataVizPBlockStateFromProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizConfigMemory } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";

type DataVizPBlockStateOptions = Parameters<
  typeof makeDataVizPBlockStateFromProps
>[0];

function _getDataVizPBlockProps(
  options: Omit<DataVizPBlockStateOptions, "blockId" | "vizConfigMemory">,
): DataVizPBlockProps {
  return makeDataVizPBlockStateFromProps({
    ...options,
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

describe("makeDataVizPBlockStateFromProps", () => {
  it("converts vizConfig to match the new vizType when vizType changes", () => {
    const actualProps = _getDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "bar",
        vizConfig: { vizType: "table" },
      },
      changed: { vizType: true },
    });
    expect(actualProps.vizType).toBe("bar");
    expect(actualProps.vizConfig.vizType).toBe("bar");
  });

  it("converts vizConfig from one chart type to another", () => {
    const actualProps = _getDataVizPBlockProps({
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
    expect(actualProps.vizConfig.vizType).toBe("line");
  });

  it("syncs vizType from vizConfig when vizConfig changes type but vizType has not caught up", () => {
    const actualProps = _getDataVizPBlockProps({
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
    expect(actualProps.vizType).toBe("pie");
    expect(actualProps.vizConfig.vizType).toBe("pie");
  });

  it("fills in missing vizType and vizConfig with defaults", () => {
    const actualProps = _getDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
      },
      changed: {},
    });
    expect(actualProps.vizType).toBe("table");
    expect(actualProps.vizConfig).toEqual({ vizType: "table" });
  });

  it("fills in missing nlQuery with empty defaults", () => {
    const actualProps = _getDataVizPBlockProps({
      props: {
        vizType: "table",
        vizConfig: { vizType: "table" },
      },
      changed: {},
    });
    expect(actualProps.nlQuery).toEqual({
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
    const actualProps = _getDataVizPBlockProps({ props, changed: {} });
    expect(actualProps).toEqual(props);
  });

  it("preserves axis keys present in both types when converting bar→line", () => {
    const actualProps = _getDataVizPBlockProps({
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
    expect(actualProps.vizConfig.vizType).toBe("line");
    if (actualProps.vizConfig.vizType === "line") {
      expect(actualProps.vizConfig.xAxisKey).toBe("category");
      expect(actualProps.vizConfig.series[0]?.key).toBe("value");
      expect(actualProps.vizConfig.series[0]?.renderAs).toBe("line");
    }
  });

  it("does not rewrite persisted props on Puck's load pass", () => {
    const props: Partial<DataVizPBlockProps> = {
      nlQuery: { prompt: "p", rawSql: "s", generations: [] },
      vizType: "table",
      vizConfig: { vizType: "table" },
    };
    const actualProps = _getDataVizPBlockProps({
      props,
      changed: { vizType: true, vizConfig: true, nlQuery: true },
      trigger: "load",
    });
    expect(actualProps).toBe(props);
    expect(actualProps).not.toHaveProperty("globalFilterSubscription");
    expect(actualProps).not.toHaveProperty("localFilters");
  });

  it("does not convert vizConfig on load even when vizType disagrees", () => {
    const props: Partial<DataVizPBlockProps> = {
      nlQuery: { prompt: "", rawSql: "", generations: [] },
      vizType: "bar",
      vizConfig: { vizType: "table" },
    };
    const actualProps = _getDataVizPBlockProps({
      props,
      changed: { vizType: true },
      trigger: "load",
    });
    expect(actualProps.vizConfig).toEqual({ vizType: "table" });
    expect(actualProps.vizType).toBe("bar");
  });
});

describe("makeDataVizPBlockStateFromProps viz config memory", () => {
  it("keeps each block's memory separate", () => {
    // Puck registers one ComponentConfig per component type, so a single
    // resolveData closure serves every DataViz block on the page. With a
    // single block this passes either way; with two it is the whole test.
    const blockOnePieState = makeDataVizPBlockStateFromProps({
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
    const blockTwoPieState = makeDataVizPBlockStateFromProps({
      props: {
        vizType: "pie",
        vizConfig: otherBarConfig,
      },
      changed: { vizType: true },
      blockId: "block-2",
      vizConfigMemory: blockOnePieState.vizConfigMemory,
    });

    expect(blockTwoPieState.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
    expect(blockTwoPieState.vizConfigMemory["block-2"]?.bar).toStrictEqual(
      otherBarConfig,
    );

    // Block one switching back must restore its own config, not block two's.
    const restoredBarState = makeDataVizPBlockStateFromProps({
      props: {
        vizType: "bar",
        vizConfig: blockOnePieState.props.vizConfig,
      },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: blockTwoPieState.vizConfigMemory,
    });
    expect(restoredBarState.props.vizConfig).toStrictEqual(STYLED_BAR_CONFIG);
  });

  it("restores styling a pie config cannot carry on a bar -> pie -> bar trip", () => {
    const pieState = makeDataVizPBlockStateFromProps({
      props: { vizType: "pie", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });
    expect(pieState.props.vizConfig).not.toHaveProperty("chartStyle");

    const barState = makeDataVizPBlockStateFromProps({
      props: { vizType: "bar", vizConfig: pieState.props.vizConfig },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: pieState.vizConfigMemory,
    });
    expect(barState.props.vizConfig).toStrictEqual(STYLED_BAR_CONFIG);
  });

  it("converts when the target type has no memory", () => {
    const lineState = makeDataVizPBlockStateFromProps({
      props: { vizType: "line", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });

    expect(lineState.props.vizConfig.vizType).toBe("line");
    expect(lineState.props.vizConfig).toMatchObject({
      xAxisKey: "category",
      withLegend: false,
    });
  });

  it("records the outgoing config keyed by its own viz type", () => {
    const pieState = makeDataVizPBlockStateFromProps({
      props: { vizType: "pie", vizConfig: STYLED_BAR_CONFIG },
      changed: { vizType: true },
      blockId: "block-1",
      vizConfigMemory: {},
    });

    expect(pieState.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
    expect(pieState.vizConfigMemory["block-1"]?.pie).toBeUndefined();
  });

  it("writes no memory on Puck's load pass", () => {
    const existingVizConfigMemory: DataVizConfigMemory = {
      "block-1": { bar: STYLED_BAR_CONFIG },
    };
    const loadState = makeDataVizPBlockStateFromProps({
      props: { vizType: "bar", vizConfig: { vizType: "table" } },
      changed: { vizType: true },
      trigger: "load",
      blockId: "block-1",
      vizConfigMemory: existingVizConfigMemory,
    });

    expect(loadState.vizConfigMemory).toBe(existingVizConfigMemory);
    expect(loadState.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
  });

  it("leaves memory untouched when only vizConfig changed", () => {
    const existingVizConfigMemory: DataVizConfigMemory = {
      "block-1": { bar: STYLED_BAR_CONFIG },
    };
    const configChangeState = makeDataVizPBlockStateFromProps({
      props: {
        vizType: "table",
        vizConfig: STYLED_BAR_CONFIG,
      },
      changed: { vizConfig: true },
      blockId: "block-1",
      vizConfigMemory: existingVizConfigMemory,
    });

    expect(configChangeState.props.vizType).toBe("bar");
    expect(configChangeState.vizConfigMemory).toBe(existingVizConfigMemory);
    expect(configChangeState.vizConfigMemory["block-1"]?.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
  });
});

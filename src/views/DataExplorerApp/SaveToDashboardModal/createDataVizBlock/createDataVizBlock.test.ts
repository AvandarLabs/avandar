import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { describe, expect, it } from "vitest";
import {
  createDataVizBlock,
  DATA_EXPLORER_FALLBACK_PROMPT,
} from "@/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock";

describe("createDataVizBlock", () => {
  it("returns a DataViz block whose props mirror the input rawSQL, prompt, and viz config", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const block = createDataVizBlock({
      rawSQL: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });

    expect(block.type).toBe("DataViz");
    expect(block.props.nlQuery.prompt).toBe("Show one");
    expect(block.props.nlQuery.rawSql).toBe("SELECT 1");
    expect(block.props.nlQuery.generations).toEqual([
      { prompt: "Show one", rawSql: "SELECT 1" },
    ]);
    expect(block.props.vizType).toBe("table");
    expect(block.props.vizConfig).toEqual(vizConfig);
  });

  it("stamps a unique UUID into props.id for every call", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const blockA = createDataVizBlock({
      rawSQL: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });
    const blockB = createDataVizBlock({
      rawSQL: "SELECT 1",
      prompt: "Show one",
      vizType: "table",
      vizConfig,
    });

    expect(blockA.props.id).toEqual(expect.any(String));
    expect(blockA.props.id.length).toBeGreaterThan(0);
    expect(blockA.props.id).not.toBe(blockB.props.id);
  });

  it("falls back to a non-empty default prompt when prompt is undefined so the block renders", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("bar");
    const block = createDataVizBlock({
      rawSQL: "SELECT a, b FROM t",
      prompt: undefined,
      vizType: "bar",
      vizConfig,
    });

    expect(block.props.nlQuery.prompt).toBe(DATA_EXPLORER_FALLBACK_PROMPT);
    expect(block.props.nlQuery.generations).toEqual([
      {
        prompt: DATA_EXPLORER_FALLBACK_PROMPT,
        rawSql: "SELECT a, b FROM t",
      },
    ]);
  });

  it("falls back to the default prompt when the supplied prompt is just whitespace", () => {
    const vizConfig = VizConfigs.makeEmptyConfig("table");
    const block = createDataVizBlock({
      rawSQL: "SELECT 1",
      prompt: "   ",
      vizType: "table",
      vizConfig,
    });

    expect(block.props.nlQuery.prompt).toBe(DATA_EXPLORER_FALLBACK_PROMPT);
  });
});

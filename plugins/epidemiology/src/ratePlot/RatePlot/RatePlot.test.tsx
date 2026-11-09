import { makePluginTranslator, PluginVizProvider } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { RatePlot } from "./RatePlot";
import type { PluginVizComponentProps } from "@avandar/plugin-sdk";

const BOROUGH_ROWS: PluginVizComponentProps["rows"] = [
  { borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 },
  { borough: "Queens", rate: 8.1, lower: 6.2, upper: 10.3 },
];

const RATE_SETTINGS: PluginVizComponentProps["settings"] = {
  labelColumn: "borough",
  rateColumn: "rate",
  lowerColumn: "lower",
  upperColumn: "upper",
  sort: "rate",
};

function _renderRatePlot(
  rows: PluginVizComponentProps["rows"],
  options: {
    locale?: string;
    settings?: PluginVizComponentProps["settings"];
  } = {},
): void {
  render(
    <MantineProvider>
      <PluginVizProvider
        vizId="rate-plot"
        t={makePluginTranslator({
          locale: options.locale ?? "en-US",
          messages: { en: englishMessages },
        })}
      >
        <RatePlot
          rows={rows}
          columns={[
            { name: "borough", dataType: "varchar" },
            { name: "rate", dataType: "double" },
            { name: "lower", dataType: "double" },
            { name: "upper", dataType: "double" },
          ]}
          settings={options.settings ?? RATE_SETTINGS}
          isTruncated={false}
          width={600}
          height={400}
        />
      </PluginVizProvider>
    </MantineProvider>,
  );
}

function _getWhiskers(): Element[] {
  return Array.from(document.querySelectorAll(".recharts-errorBar"));
}

function _getTickTexts(): string[] {
  return Array.from(
    document.querySelectorAll(".recharts-cartesian-axis-tick-value"),
  ).map((tick) => {
    return tick.textContent ?? "";
  });
}

describe("RatePlot", () => {
  it("draws a chart named by its translated title", () => {
    _renderRatePlot(BOROUGH_ROWS);
    expect(screen.getByRole("img", { name: "Rate plot" })).toBeInTheDocument();
  });

  it("draws the chart at the given size", () => {
    _renderRatePlot(BOROUGH_ROWS);
    const chart = screen.getByRole("img", { name: "Rate plot" });
    expect(chart).toHaveAttribute("width", "600");
    expect(chart).toHaveAttribute("height", "400");
  });

  it("shows a message instead of a chart when no row has a numeric rate", () => {
    _renderRatePlot([{ borough: "Bronx", rate: null }]);
    expect(
      screen.getByText("No rows have a numeric rate to plot."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("draws whiskers for each row that has both bounds", () => {
    _renderRatePlot(BOROUGH_ROWS);
    expect(_getWhiskers()).toHaveLength(2);
  });

  it("draws no whiskers for a row missing one bound", () => {
    _renderRatePlot([
      { borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 },
      { borough: "Queens", rate: 8.1, lower: null, upper: 10.3 },
      { borough: "Brooklyn", rate: 11, lower: 9, upper: null },
    ]);
    expect(_getWhiskers()).toHaveLength(1);
  });

  it("draws no whiskers when the bound columns are not set", () => {
    _renderRatePlot(BOROUGH_ROWS, {
      settings: { ...RATE_SETTINGS, lowerColumn: "", upperColumn: "" },
    });
    expect(_getWhiskers()).toHaveLength(0);
  });

  it("starts a whisker at the dot when the lower bound is above the rate", () => {
    _renderRatePlot([{ borough: "Bronx", rate: 5, lower: 8, upper: 7 }]);
    const dotX = document
      .querySelector(".recharts-scatter-symbol path")
      ?.getAttribute("cx");
    const stem = _getWhiskers()[0]?.querySelectorAll("line")[1];
    const stemX = stem?.getAttribute("x1");
    expect(dotX).toMatch(/\S/);
    expect(stemX).toMatch(/\S/);
    expect(stemX).toBe(dotX);
  });

  it("formats the rate axis ticks in the translator's locale", () => {
    _renderRatePlot([{ borough: "Bronx", rate: 2000 }], { locale: "de-DE" });
    expect(_getTickTexts()).toContain("1.000");
  });

  it("ends a long row label in an ellipsis on the axis", () => {
    _renderRatePlot([
      { borough: "A borough with a very long name indeed", rate: 3 },
    ]);
    expect(_getTickTexts()).toContain("A borough with a very…");
  });
});

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

function _renderRatePlot(rows: PluginVizComponentProps["rows"]): void {
  render(
    <MantineProvider>
      <PluginVizProvider
        vizId="rate-plot"
        t={makePluginTranslator({
          locale: "en-US",
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
          settings={RATE_SETTINGS}
          isTruncated={false}
          width={600}
          height={400}
        />
      </PluginVizProvider>
    </MantineProvider>,
  );
}

describe("RatePlot", () => {
  it("draws a chart named by its translated title at the given size", () => {
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
});

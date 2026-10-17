import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it } from "vitest";
import { BarChartVizConfigs } from "$/models/vizs/BarChartVizConfig/BarChartVizConfigs";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";
import { SeriesAwareVizForm } from "./SeriesAwareVizForm";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";

i18n.load("en", {});
i18n.activate("en");

const fields: readonly QueryResult.BoundColumn[] = [
  {
    id: "region" as QueryColumn.Id,
    name: "region",
    dataType: "varchar",
  } as QueryResult.BoundColumn,
  {
    id: "count" as QueryColumn.Id,
    name: "count",
    dataType: "double",
  } as QueryResult.BoundColumn,
];

function renderForm(config: BarChartVizConfig): HTMLElement {
  const { container } = render(
    <I18nProvider i18n={i18n}>
      <AvandarAppProvider>
        <SeriesAwareVizForm
          fields={fields}
          config={config}
          onConfigChange={() => {}}
        />
      </AvandarAppProvider>
    </I18nProvider>,
  );
  return container as HTMLElement;
}

describe("SeriesAwareVizForm layout", () => {
  it("renders Series before X axis in document order", () => {
    const container = renderForm({
      ...BarChartVizConfigs.makeEmptyConfig(),
      xAxisKey: "region" as QueryColumn.Id,
      series: [{ renderAs: "bar", key: "count" as QueryColumn.Id }],
    });
    const legends = Array.from(container.querySelectorAll("legend")).map(
      (l) => {
        return l.textContent ?? "";
      },
    );
    const seriesIdx = legends.indexOf("Series");
    const xAxisIdx = legends.indexOf("X axis");
    expect(seriesIdx).toBeGreaterThanOrEqual(0);
    expect(xAxisIdx).toBeGreaterThanOrEqual(0);
    expect(seriesIdx).toBeLessThan(xAxisIdx);
  });

  it("wraps each settings group in a Mantine Fieldset", () => {
    const container = renderForm({
      ...BarChartVizConfigs.makeEmptyConfig(),
      xAxisKey: "region" as QueryColumn.Id,
      series: [{ renderAs: "bar", key: "count" as QueryColumn.Id }],
    });
    const legends = Array.from(container.querySelectorAll("legend")).map(
      (l) => {
        return l.textContent ?? "";
      },
    );
    expect(legends).toEqual(expect.arrayContaining(["Series", "X axis"]));
  });

  it("still shows the Add series button in the Series fieldset", () => {
    renderForm({
      ...BarChartVizConfigs.makeEmptyConfig(),
      xAxisKey: "region" as QueryColumn.Id,
      series: [],
    });
    expect(
      screen.getByRole("button", { name: "Add series" }),
    ).toBeInTheDocument();
  });
});

import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render } from "@/test-utils";
import { FunnelChartForm } from "./FunnelChartForm";
import { PieChartForm } from "./PieChartForm";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { FunnelChartVizConfig } from "$/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types";
import type { PieChartVizConfig } from "$/models/vizs/PieChartVizConfig/PieChartVizConfig.types";

i18n.load("en", {});
i18n.activate("en");

const fields: readonly QueryResultColumn[] = [
  { name: "region", dataType: "varchar" } as QueryResultColumn,
  { name: "count", dataType: "double" } as QueryResultColumn,
];

const pieConfig: PieChartVizConfig = {
  vizType: "pie",
  nameKey: "region",
  valueKey: "count",
  isDonut: false,
  withLabels: true,
  labelsType: "value",
};

const funnelConfig: FunnelChartVizConfig = {
  vizType: "funnel",
  nameKey: "region",
  valueKey: "count",
};

describe("PieChartForm layout", () => {
  it("wraps the value pickers in a Series fieldset", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <PieChartForm
            fields={fields}
            config={pieConfig}
            data={[]}
            onConfigChange={() => {}}
          />
        </AvandarAppProvider>
      </I18nProvider>,
    );
    const legends = Array.from(container.querySelectorAll("legend")).map(
      (l) => {
        return l.textContent ?? "";
      },
    );
    expect(legends).toEqual(expect.arrayContaining(["Series"]));
  });

  it("groups chart-level toggles in a Chart settings fieldset", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <PieChartForm
            fields={fields}
            config={pieConfig}
            data={[]}
            onConfigChange={() => {}}
          />
        </AvandarAppProvider>
      </I18nProvider>,
    );
    const legends = Array.from(container.querySelectorAll("legend")).map(
      (l) => {
        return l.textContent ?? "";
      },
    );
    expect(legends).toEqual(expect.arrayContaining(["Chart settings"]));
  });
});

describe("FunnelChartForm layout", () => {
  it("wraps the value pickers in a Series fieldset", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <AvandarAppProvider>
          <FunnelChartForm
            fields={fields}
            config={funnelConfig}
            data={[]}
            onConfigChange={() => {}}
          />
        </AvandarAppProvider>
      </I18nProvider>,
    );
    const legends = Array.from(container.querySelectorAll("legend")).map(
      (l) => {
        return l.textContent ?? "";
      },
    );
    expect(legends).toEqual(expect.arrayContaining(["Series"]));
  });
});

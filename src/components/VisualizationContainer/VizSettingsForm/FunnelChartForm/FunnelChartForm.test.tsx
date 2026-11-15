import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, it } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render } from "@/test-utils";
import { FunnelChartForm } from "./FunnelChartForm";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaFunnelChartVizConfig } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfig.types";

i18n.load("en", {});
i18n.activate("en");

const fields: readonly QueryResult.ColumnWithId[] = [
  {
    id: "region" as QueryColumn.Id,
    name: "region",
    dataType: "varchar",
  } as QueryResult.ColumnWithId,
  {
    id: "count" as QueryColumn.Id,
    name: "count",
    dataType: "double",
  } as QueryResult.ColumnWithId,
];

const funnelConfig: AvaFunnelChartVizConfig = {
  vizType: "funnel",
  nameKey: "region" as QueryColumn.Id,
  valueKey: "count" as QueryColumn.Id,
};

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

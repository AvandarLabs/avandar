type Props = { children: ReactNode };
import { Model } from "@avandar/models";
import { expect, it } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { makeNameResolvedVizConfigFromColumnIdConfig } from "$/models/vizs/makeNameResolvedVizConfigFromColumnIdConfig/makeNameResolvedVizConfigFromColumnIdConfig";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
/** Exercises column reconstruction and chart edits through the real store. */
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const _STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "quarter" as QueryColumn.Id,
  layout: "group",
  withLegend: true,
  series: [
    {
      key: "revenue" as QueryColumn.Id,
      renderAs: "line",
      label: "Revenue trend",
      color: "#123456",
      strokeWidth: 4,
    },
    {
      key: "profit" as QueryColumn.Id,
      renderAs: "bar",
      label: "Profit",
      color: "#654321",
    },
  ],
};

function _createSourceColumn({
  name,
  dataType,
}: {
  name: string;
  dataType: AvaDataType.T;
}): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `dc_${name}` as DatasetColumn.Id,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

function _Wrapper({ children }: Readonly<Props>): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    {
      wrapper: _Wrapper,
    },
  );
}
/** Shared setup and fixtures for DataExplorerIdentityTestFixtures. */
export const DataExplorerIdentityTestFixtures = {
  QueryColumn,
  makeNameResolvedVizConfigFromColumnIdConfig,
  act,
  Model,
  expect,
  it,
  _STYLED_BAR_CONFIG,
  _createSourceColumn,
  _renderStateManager,
};

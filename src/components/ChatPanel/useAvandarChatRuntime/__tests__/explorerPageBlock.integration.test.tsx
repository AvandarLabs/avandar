/**
 * Guards the path from the Data Explorer's real state to the page block the
 * agent reads: `DataExplorerStateManager` -> `useChatPageContext` ->
 * `createAgentPageContext` -> `buildAgentPageContextBlock`, with personal
 * values in the explorer's SQL swapped for vault placeholders.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { createAgentPageContext } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => {
  return {
    useRouterState: (options: { select: (state: unknown) => unknown }) => {
      return options.select({
        location: { pathname: "/acme/data-explorer" },
      });
    },
  };
});

const DATASET_ID = "e35debb7-335c-4af6-974c-341c16764a0a";
const DATASETS = [{ id: DATASET_ID, name: "Response cases", columns: [] }];

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

/** Renders the explorer's state with the agent's SQL and its result. */
function _renderExplorerWithQuery(sql: string) {
  const { result } = renderHook(
    () => {
      return {
        page: useChatPageContext(),
        dispatch: DataExplorerStateManager.useDispatch(),
      };
    },
    { wrapper: _wrapper },
  );
  act(() => {
    result.current.dispatch.setRawSql(sql);
  });
  act(() => {
    result.current.dispatch.syncVizFromQueryResult([
      { id: "district_name", name: "district_name", dataType: "varchar" },
      {
        id: "visits",
        name: `count_star() FILTER (WHERE (patient_name = 'Jane Doe'))`,
        dataType: "bigint",
      },
    ] as never);
  });
  return result;
}

describe("explorer page block", () => {
  it("hides personal values in the explorer's query and result columns", async () => {
    const result = _renderExplorerWithQuery(
      `SELECT "district_name" FROM "${DATASET_ID}" WHERE "patient_name" = 'Jane Doe' AND "state" = 'Texas'`,
    );
    const context = await createAgentPageContext({
      pathname: "/acme/data-explorer",
      chatPageContext: result.current.page,
      dashboardEditorState: {
        activeDashboardId: undefined,
        editorData: undefined,
      },
      datasets: DATASETS,
      loader: {
        getDashboard: vi.fn(),
        getMapName: vi.fn(),
        getCaseTypeName: vi.fn(),
      },
    });
    const vault = createSqlPlaceholderVault();

    const block = buildAgentPageContextBlock({
      context,
      aliases: SqlTableAlias.fromSchema({ datasets: DATASETS }),
      isSensitive: isPersonalDataText,
      redactSql: (sql) => {
        return vault.redact(sql, {
          isSensitiveColumn: isPersonalColumnName,
          isSensitiveValue: isPersonalDataText,
        });
      },
      maskText: vault.maskText,
    });

    expect(block).toContain(
      `Query on screen: SELECT "district_name" FROM "t0" WHERE "patient_name" = '<value 1>' AND "state" = 'Texas'`,
    );
    // DuckDB names an unaliased column after its restored SQL.
    expect(block).toContain(
      "Result columns: district_name varchar, count_star() FILTER (WHERE (patient_name = '<value 1>')) bigint",
    );
    expect(block).not.toContain("Jane Doe");
  });
});

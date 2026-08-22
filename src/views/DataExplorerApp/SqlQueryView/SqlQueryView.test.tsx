/**
 * Re-running edited SQL is the most deliberate query a user can make, and
 * `query.ran` has to be able to say so.
 */
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { INITIAL_DATA_EXPLORER_STATE } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { SqlQueryView } from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView";
import type { ReactNode } from "react";

// The read-only SQL block resolves a workspace dataset/column catalog for
// display pills, which needs router context and a QueryClient this test does
// not set up. The trigger stamp under test does not depend on that catalog.
vi.mock("@/components/sql/sql-helpers/useSqlDisplayCatalog", () => {
  return {
    useSqlDisplayCatalog: () => {
      return { catalog: { datasets: [] }, isReady: true };
    },
  };
});

// The real edit panel renders a CodeMirror editor with no plain input
// element, so `fireEvent.change` cannot drive it. CodeMirror wiring is
// covered by SqlEditor.test.tsx and AvaSqlBlock.test.tsx; this test only
// needs a real textbox to exercise `onSubmitSql`'s dispatch order.
vi.mock("@/components/sql/SqlEditor/SqlQueryEditPanel", () => {
  return {
    SqlQueryEditPanel: ({
      initialSql,
      submitButtonLabel,
      cancelButtonLabel,
      onSubmit,
      onCancel,
    }: {
      initialSql: string;
      submitButtonLabel: string;
      cancelButtonLabel: string;
      onSubmit: (sql: string) => void;
      onCancel: () => void;
    }) => {
      const [draftSql, setDraftSql] = useState(initialSql);
      return (
        <div>
          <textarea
            value={draftSql}
            onChange={(event) => {
              setDraftSql(event.target.value);
            }}
          />
          <button
            onClick={() => {
              onSubmit(draftSql);
            }}
          >
            {submitButtonLabel}
          </button>
          <button onClick={onCancel}>{cancelButtonLabel}</button>
        </div>
      );
    },
  };
});

// The real parser needs workspace dataset metadata to resolve columns; this
// test only needs `applySqlMapping` to receive a payload so the trigger's
// composition with the rest of `onSubmitSql` is exercised.
vi.mock("@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery", () => {
  return {
    useSqlToStructuredQuery: () => {
      return {
        parseSql: () => {
          return {
            query: { queryColumns: [], aggregations: {} },
            isFullyMapped: true,
            unmappedReasons: [],
          };
        },
      };
    },
  };
});

function TriggerProbe(): ReactNode {
  const state = DataExplorerStateManager.useState();
  return <output data-testid="trigger">{state.queryTrigger}</output>;
}

function _renderSqlView(): void {
  render(
    <DataExplorerStateManager.Provider
      initialStateOverrides={{
        ...INITIAL_DATA_EXPLORER_STATE,
        rawSql: "SELECT 1",
      }}
    >
      <SqlQueryView />
      <TriggerProbe />
    </DataExplorerStateManager.Provider>,
  );
}

describe("SqlQueryView", () => {
  it("records that the next run came from a SQL submit", () => {
    _renderSqlView();

    fireEvent.click(screen.getByRole("button", { name: /edit query/i }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "SELECT 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /re-run query/i }));

    expect(screen.getByTestId("trigger")).toHaveTextContent("sql_submit");
  });
});

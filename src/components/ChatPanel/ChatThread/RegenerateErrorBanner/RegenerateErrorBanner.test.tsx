import { describe, expect, it, vi } from "vitest";
import { RegenerateErrorBanner } from "@/components/ChatPanel/ChatThread/RegenerateErrorBanner/RegenerateErrorBanner";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { render, screen } from "@/test-utils";

const explorerState = vi.hoisted(() => {
  return {
    lastQueryError: "Cannot safely analyze DuckDB SQL: uninspectable-source",
    rawSql: "select 1",
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useAui: () => {
      return { thread: () => {return { append: vi.fn() }} };
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager",
  () => {
    return {
      DataExplorerStateManager: {
        useState: () => {
          return explorerState;
        },
        useDispatch: () => {
          return { setLastQueryError: vi.fn() };
        },
      },
    };
  },
);

describe("RegenerateErrorBanner", () => {
  it("explains a failed query in plain language instead of the raw error", () => {
    render(
      <AvandarAppProvider>
        <RegenerateErrorBanner />
      </AvandarAppProvider>,
    );
    expect(screen.getByText("That query failed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Avandar couldn't confirm that this query only reads your datasets, so it didn't run it.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/uninspectable-source/)).toBeNull();
  });
});

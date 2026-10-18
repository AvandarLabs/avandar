/**
 * Shared setup for `PostgresConnectorImportView`'s split suite. Each test file
 * imports this first so its `vi.mock` calls register before the module graph.
 *
 * Drives the real loader hook against a stubbed HTTP boundary
 * (`APIClient`/`DatabaseConnectionClient`), never a mocked hook, per
 * `DataImportView/CLAUDE.md`'s "do not mock the seam you are testing" rule.
 * The preview responses carry real rows and columns, the same shape the edge
 * function returns, so an assertion about the rendered preview cannot pass
 * against a stub that proves nothing.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, render, RenderOptions, screen } from "@/test-utils";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

/** A test-and-save result whose connection has two tables to pick from. */
export const TWO_RELATIONS_SAVE_RESULT = {
  connectionId: "10000000-0000-4000-8000-000000000001",
  relations: [
    {
      relationId: "public.customers",
      label: "public.customers",
      kind: "table",
    },
    { relationId: "public.orders", label: "public.orders", kind: "table" },
  ],
};

const { getAllPostgresMock, apiPostMock, apiGetMock } = vi.hoisted(() => {
  return {
    getAllPostgresMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiGetMock: vi.fn(),
  };
});

/** Stub for `APIClient.get`: the `relations` and `preview` routes. */
export { apiGetMock };

/** Stub for `APIClient.post`: the `test-and-save` route. */
export { apiPostMock };

/** The saved databases `DatabaseConnectionClient.useGetAllPostgres` returns. */
export { getAllPostgresMock };

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock, post: apiPostMock } };
});

vi.mock("@/clients/connections/DatabaseConnectionClient", () => {
  return {
    DatabaseConnectionClient: {
      getClientName: (): string => {
        return "DatabaseConnectionClient";
      },
      useGetAllPostgres: (): [unknown[], boolean] => {
        return [getAllPostgresMock(), false];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return {
    DatasetQueryClient: {
      useGetPreviewData: (): [unknown] => {
        return [undefined];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      insertPostgresTableDataset: vi.fn(),
      useGetAll: (): [[], boolean] => {
        return [[], false];
      },
      QueryKeys: {
        getAll: (): string[] => {
          return ["datasets"];
        },
      },
    },
  };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return { DatasetParquetStorageClient: { startDatasetUpload: vi.fn() } };
  },
);

vi.mock("@/lib/ui/viz/DataGrid", async () => {
  const { createElement } = await import("react");
  return {
    DataGrid: function DataGridMock(): ReactElement {
      return createElement("div", { "data-testid": "data-grid-mock" });
    },
  };
});

/** Renders `ui` inside a fresh React Query client. */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
    ...options,
  });
}

/** Resets every mock to a workspace with no saved databases. */
export function resetPostgresConnectorImportViewMocks(): void {
  vi.mocked(useCurrentWorkspace).mockReturnValue({
    id: "00000000-0000-4000-8000-000000000002",
    ownerId: "00000000-0000-4000-8000-000000000001",
    name: "Test Workspace",
    slug: "test-workspace",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subscription: undefined,
  } as Workspace.WithSubscription);

  getAllPostgresMock.mockReset().mockReturnValue([]);
  apiPostMock.mockReset();
  apiGetMock.mockReset();
}

/** Fills the required connection fields and submits the form. */
export async function connectThroughForm(): Promise<void> {
  fireEvent.change(screen.getByLabelText(/^host$/i), {
    target: { value: "db.example.org" },
  });
  // A text box, since the saved-database picker is also labeled "Database".
  fireEvent.change(screen.getByRole("textbox", { name: /^database$/i }), {
    target: { value: "reporting" },
  });
  fireEvent.change(screen.getByLabelText(/^username$/i), {
    target: { value: "readonly" },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: "secret" },
  });
  await act(async () => {
    screen.getByRole("button", { name: /^connect$/i }).click();
  });
}

/** Opens the select named `selectName` and picks `optionLabel` from it. */
export async function pickSelectOption(
  options: Readonly<{ selectName: RegExp | string; optionLabel: string }>,
): Promise<void> {
  const select = await screen.findByRole("combobox", {
    name: options.selectName,
  });
  await act(async () => {
    fireEvent.click(select);
    fireEvent.focus(select);
  });
  const option = await screen.findByRole("option", {
    name: options.optionLabel,
    hidden: true,
  });
  await act(async () => {
    fireEvent.click(option);
  });
}

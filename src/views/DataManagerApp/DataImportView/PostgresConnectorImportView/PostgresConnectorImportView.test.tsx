import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, render, RenderOptions, screen, waitFor } from "@/test-utils";
import { PostgresConnectorImportView } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectorImportView";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

/**
 * Drives the real loader hook against a stubbed HTTP boundary
 * (`APIClient`/`DatabaseConnectionClient`), never a mocked hook, per
 * `DataImportView/CLAUDE.md`'s "do not mock the seam you are testing" rule.
 * The preview response below carries real rows and columns, the same shape
 * the edge function returns, so an assertion about the rendered preview
 * cannot pass against a stub that proves nothing.
 */

const { getAllPostgresMock, apiPostMock, apiGetMock } = vi.hoisted(() => {
  return {
    getAllPostgresMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiGetMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock, post: apiPostMock } };
});

vi.mock("@/clients/connections/DatabaseConnectionClient", () => {
  return {
    DatabaseConnectionClient: {
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

function renderWithProviders(
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

describe("PostgresConnectorImportView", () => {
  beforeEach(() => {
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
  });

  it("opens the connection form when there are no saved databases", () => {
    renderWithProviders(<PostgresConnectorImportView />);

    expect(screen.getByLabelText(/^host$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("tests, saves, lists tables and imports one on a successful connection", async () => {
    apiPostMock.mockResolvedValue({
      connectionId: "10000000-0000-4000-8000-000000000001",
      relations: [
        { relationId: "public.customers", label: "public.customers", kind: "table" },
      ],
    });
    apiGetMock.mockResolvedValue({
      columns: [{ columnName: "id", sourceType: "integer" }],
      previewRows: [{ id: 1 }],
    });

    renderWithProviders(<PostgresConnectorImportView />);

    fireEvent.change(screen.getByLabelText(/^host$/i), {
      target: { value: "db.example.org" },
    });
    fireEvent.change(screen.getByLabelText(/^database$/i), {
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

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        expect.objectContaining({
          route: "external-datasets/:connectorType/connections/test-and-save",
          pathParams: { connectorType: "postgres" },
          body: expect.objectContaining({
            host: "db.example.org",
            databaseName: "reporting",
            username: "readonly",
            password: "secret",
          }),
        }),
      );
    });

    const tableSelect = await screen.findByRole("combobox", {
      name: /table or view to import/i,
    });
    await act(async () => {
      fireEvent.click(tableSelect);
      fireEvent.focus(tableSelect);
    });
    const option = await screen.findByRole("option", {
      name: "public.customers",
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          route:
            "external-datasets/:connectorType/connections/:connectionId/relations/:relationId/preview",
        }),
      );
    });

    expect(await screen.findByText(/1 detected/i)).toBeInTheDocument();
  });

  it("surfaces a specific message when the connection is refused", async () => {
    apiPostMock.mockResolvedValue({
      error: { code: "auth_failed", message: "bad credentials" },
    });

    renderWithProviders(<PostgresConnectorImportView />);

    fireEvent.change(screen.getByLabelText(/^host$/i), {
      target: { value: "db.example.org" },
    });

    await act(async () => {
      screen.getByRole("button", { name: /^connect$/i }).click();
    });

    expect(
      await screen.findByText(/username or password was not accepted/i),
    ).toBeInTheDocument();
    // The entered host is retained rather than cleared on failure.
    expect(screen.getByLabelText(/^host$/i)).toHaveValue("db.example.org");
  });

  it("offers a saved database and lists its tables without re-opening the form", async () => {
    getAllPostgresMock.mockReturnValue([
      {
        connection: {
          id: "20000000-0000-4000-8000-000000000001",
          name: "Prod reporting replica",
        },
        postgres: {
          host: "db.example.org",
          port: 5432,
          databaseName: "reporting",
          lastVerifiedAt: new Date().toISOString(),
        },
      },
    ]);
    apiGetMock.mockImplementation(async (opts: { route: string }) => {
      if (opts.route.endsWith("/relations")) {
        return {
          relations: [
            {
              relationId: "public.orders",
              label: "public.orders",
              kind: "table",
            },
          ],
        };
      }
      return { columns: [], previewRows: [] };
    });

    renderWithProviders(<PostgresConnectorImportView />);

    expect(
      screen.queryByLabelText(/^host$/i),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          route:
            "external-datasets/:connectorType/connections/:connectionId/relations",
        }),
      );
    });
    expect(
      await screen.findByRole("combobox", { name: /table or view to import/i }),
    ).toBeInTheDocument();
  });
});

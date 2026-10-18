import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, screen, waitFor } from "@/test-utils";
import {
  apiGetMock,
  apiPostMock,
  getAllPostgresMock,
  renderWithProviders,
  resetPostgresConnectorImportViewMocks,
} from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/__tests__/PostgresConnectorImportView.fixtures";
import { PostgresConnectorImportView } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectorImportView";

describe("PostgresConnectorImportView - connecting and importing", () => {
  beforeEach(() => {
    resetPostgresConnectorImportViewMocks();
  });

  it("opens the connection form when there are no saved databases", () => {
    renderWithProviders(<PostgresConnectorImportView />);

    expect(screen.getByLabelText(/^host$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("creates a dataset by connecting, picking a table, and saving", async () => {
    apiPostMock.mockResolvedValue({
      connectionId: "10000000-0000-4000-8000-000000000001",
      relations: [
        {
          relationId: "public.customers",
          label: "public.customers",
          kind: "table",
        },
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
          route: "connectors/:connectorType/connections/test-and-save",
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
            "connectors/:connectorType/connections/:connectionId/relations/:relationId/preview",
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

  it("surfaces the specific too_large message, not a generic fallback, when listing relations fails", async () => {
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
    apiGetMock.mockResolvedValue({
      error: { code: "too_large", message: "catalog listing too large" },
    });

    renderWithProviders(<PostgresConnectorImportView />);

    expect(
      await screen.findByText(/more rows than avandar can import/i),
    ).toBeInTheDocument();
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

    expect(screen.queryByLabelText(/^host$/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          route:
            "connectors/:connectorType/connections/:connectionId/relations",
        }),
      );
    });
    expect(
      await screen.findByRole("combobox", { name: /table or view to import/i }),
    ).toBeInTheDocument();
  });
});

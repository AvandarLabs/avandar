import { QueryClient } from "@tanstack/react-query";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@/test-utils";
import {
  apiGetMock,
  apiPostMock,
  connectThroughForm,
  getAllPostgresMock,
  pickSelectOption,
  renderWithProviders,
  resetPostgresConnectorImportViewMocks,
  TWO_RELATIONS_SAVE_RESULT,
} from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/__tests__/PostgresConnectorImportView.fixtures";
import { PostgresConnectorImportView } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/PostgresConnectorImportView";

/** One saved database, so the database picker is shown. */
const SAVED_REPLICA = {
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
};

describe("PostgresConnectorImportView - keeping the picker in sync", () => {
  beforeEach(() => {
    resetPostgresConnectorImportViewMocks();
  });

  it("refreshes the saved databases after a new one is connected", async () => {
    const invalidateQueriesSpy = vi.spyOn(
      QueryClient.prototype,
      "invalidateQueries",
    );
    apiPostMock.mockResolvedValue(TWO_RELATIONS_SAVE_RESULT);

    renderWithProviders(<PostgresConnectorImportView />);
    await connectThroughForm();

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["DatabaseConnectionClient"],
      });
    });
    invalidateQueriesSpy.mockRestore();
  });

  it("drops the previous table's preview when the next table's preview fails", async () => {
    apiPostMock.mockResolvedValue(TWO_RELATIONS_SAVE_RESULT);
    apiGetMock
      .mockResolvedValueOnce({
        columns: [
          { columnName: "id", sourceType: "integer", dataType: "bigint" },
        ],
        previewRows: [{ id: 1 }],
      })
      .mockResolvedValueOnce({
        error: { code: "timeout", message: "statement timed out" },
      });

    renderWithProviders(<PostgresConnectorImportView />);
    await connectThroughForm();
    await pickSelectOption({
      selectName: /table or view to import/i,
      optionLabel: "public.customers",
    });
    expect(await screen.findByText(/1 detected/i)).toBeInTheDocument();

    await pickSelectOption({
      selectName: /table or view to import/i,
      optionLabel: "public.orders",
    });

    await waitFor(() => {
      expect(screen.queryByText(/1 detected/i)).not.toBeInTheDocument();
    });
  });

  it("keeps the latest table's preview when an earlier pick's preview arrives after it", async () => {
    apiPostMock.mockResolvedValue(TWO_RELATIONS_SAVE_RESULT);
    let resolveCustomersPreview: (value: unknown) => void = () => {};
    apiGetMock
      .mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveCustomersPreview = resolve;
        });
      })
      .mockResolvedValueOnce({
        columns: [
          { columnName: "id", sourceType: "integer", dataType: "bigint" },
          { columnName: "total", sourceType: "numeric", dataType: "double" },
        ],
        previewRows: [{ id: 1, total: "9.50" }],
      });

    renderWithProviders(<PostgresConnectorImportView />);
    await connectThroughForm();
    await pickSelectOption({
      selectName: /table or view to import/i,
      optionLabel: "public.customers",
    });
    await pickSelectOption({
      selectName: /table or view to import/i,
      optionLabel: "public.orders",
    });
    expect(await screen.findByText(/2 detected/i)).toBeInTheDocument();

    await act(async () => {
      resolveCustomersPreview({
        columns: [
          { columnName: "id", sourceType: "integer", dataType: "bigint" },
        ],
        previewRows: [{ id: 1 }],
      });
    });

    expect(screen.getByText(/2 detected/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 detected/i)).not.toBeInTheDocument();
  });

  it("keeps the database the user picked when an earlier new database's save finishes after it", async () => {
    getAllPostgresMock.mockReturnValue([SAVED_REPLICA]);
    apiGetMock.mockResolvedValue({
      relations: [
        {
          relationId: "public.replica_orders",
          label: "public.replica_orders",
          kind: "table",
        },
      ],
    });
    let resolveSave: (value: unknown) => void = () => {};
    apiPostMock.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveSave = resolve;
      });
    });

    renderWithProviders(<PostgresConnectorImportView />);
    await pickSelectOption({
      selectName: "Database",
      optionLabel: "+ New database",
    });
    await connectThroughForm();
    await pickSelectOption({
      selectName: "Database",
      optionLabel: "Prod reporting replica - db.example.org:5432/reporting",
    });

    await act(async () => {
      resolveSave(TWO_RELATIONS_SAVE_RESULT);
    });

    // The picker still lists the saved database's tables, not the tables
    // the late save returned for the connection the user moved away from.
    const tableSelect = screen.getByRole("combobox", {
      name: /table or view to import/i,
    });
    await act(async () => {
      fireEvent.click(tableSelect);
      fireEvent.focus(tableSelect);
    });
    expect(
      await screen.findByRole("option", {
        name: "public.replica_orders",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "public.customers", hidden: true }),
    ).not.toBeInTheDocument();
  });
});

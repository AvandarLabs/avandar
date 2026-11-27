import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, screen, waitFor } from "@/test-utils";
import { Logger } from "@/utils/Logger";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import {
  FIRST_TAB,
  FIRST_TAB_GID,
  SECOND_TAB,
  SECOND_TAB_GID,
  TAB_CSV,
  chooseFormTab,
  chooseImportTab,
  clickProcess,
  dropLocalDatasetMock,
  fixtureTabs,
  getGoogleSheetTabCsvExportMock,
  getGoogleSheetTabsMock,
  getImportTabOptions,
  googlePickerHarness,
  navigateToExternalUrlMock,
  notifyErrorMock,
  pickTheSheet,
  renderWithProviders,
  sniffCsvFile,
  startCsvImportMock,
  useGetPreviewDataMock,
} from "../GoogleSheetsImportViewTestHelpers";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { APIReturnType } from "@/types/http-api.types";

describe("GoogleSheetsImportView", () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "google-sheets-import-test@example.com",
    } as User.T);

    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000002",
      ownerId: "00000000-0000-4000-8000-000000000001",
      name: "Test Workspace",
      slug: "test-workspace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subscription: undefined,
    } as Workspace.WithSubscription);

    notifyErrorMock.mockClear();
    startCsvImportMock.mockClear();
    dropLocalDatasetMock.mockClear();
    useGetPreviewDataMock.mockClear();
    navigateToExternalUrlMock.mockClear();
    getGoogleSheetTabsMock.mockClear();
    getGoogleSheetTabCsvExportMock.mockClear();
    googlePickerHarness.pickerSetVisible.mockClear();
    googlePickerHarness.picker = {
      setVisible: googlePickerHarness.pickerSetVisible,
    };
    googlePickerHarness.isLoadingAPI = false;
    googlePickerHarness.isGoogleAuthenticated = true;
    googlePickerHarness.onCancel = null;

    getGoogleSheetTabsMock.mockResolvedValue(fixtureTabs());
    getGoogleSheetTabCsvExportMock.mockImplementation(
      async (params: { sheetId: number }) => {
        return { csvText: TAB_CSV[params.sheetId] ?? "", sourceVersion: "42" };
      },
    );

    startCsvImportMock.mockImplementation(async (params) => {
      const sniff = await sniffCsvFile(params.file);
      useGetPreviewDataMock.mockReturnValue([sniff.previewRows]);
      return sniff;
    });

    useGetPreviewDataMock.mockReturnValue([[]]);

    vi.mocked(APIClient.get).mockImplementation((async (opts) => {
      if (opts.route === "google-auth/auth-url") {
        const payload: APIReturnType<"google-auth/auth-url", "GET"> = {
          authorizeURL: "https://accounts.google.com/o/oauth2/v2/auth?test=1",
        };
        return payload;
      }
      throw new Error(`Unexpected APIClient.get route: ${String(opts.route)}`);
    }) as typeof APIClient.get);
  });

  it("waits for the Picker API before offering Pick", () => {
    googlePickerHarness.picker = undefined;
    googlePickerHarness.isLoadingAPI = true;

    renderWithProviders(<GoogleSheetsImportView />);

    expect(
      screen.queryByRole("button", { name: /pick a sheet/i }),
    ).not.toBeInTheDocument();
  });

  it("notifies when Pick is clicked and the Picker was never built", () => {
    googlePickerHarness.picker = undefined;
    googlePickerHarness.isLoadingAPI = false;
    const loggerError = vi.spyOn(Logger, "error").mockImplementation(() => {
      return undefined;
    });

    renderWithProviders(<GoogleSheetsImportView />);
    fireEvent.click(screen.getByRole("button", { name: /pick a sheet/i }));

    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/could not be opened/i),
      }),
    );
    expect(loggerError).toHaveBeenCalled();
    loggerError.mockRestore();
  });

  it("lists the tabs and downloads nothing until one is chosen", async () => {
    // The whole point of listing tabs from the Sheets API's properties-only
    // read: the user is asked which tab to import before any cell is fetched.
    await pickTheSheet();

    await waitFor(() => {
      expect(getGoogleSheetTabsMock).toHaveBeenCalledWith({
        fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
        accessToken: "google-sheets-test-access-token",
      });
    });

    expect(
      await screen.findByRole("button", { name: /^process$/i }),
    ).toBeInTheDocument();
    expect(getGoogleSheetTabCsvExportMock).not.toHaveBeenCalled();
    expect(startCsvImportMock).not.toHaveBeenCalled();
  });

  it("imports a one-tab workbook without asking which tab", async () => {
    // Nothing to ask, so nothing is asked: this is the flow the connector had
    // before tabs were selectable, and it must not grow a click.
    getGoogleSheetTabsMock.mockResolvedValue([
      { sheetId: FIRST_TAB_GID, title: FIRST_TAB, index: 0 },
    ]);

    await pickTheSheet();

    // The form rendering is what says the import finished; there is no toast.
    await waitFor(() => {
      expect(screen.getByText(/2 detected/)).toBeInTheDocument();
    });
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      sheetId: FIRST_TAB_GID,
      accessToken: "google-sheets-test-access-token",
    });
    expect(
      screen.queryByRole("button", { name: /^process$/i }),
    ).not.toBeInTheDocument();
  });

  it("downloads only the tab the user picked", async () => {
    await pickTheSheet();
    await chooseImportTab(SECOND_TAB);
    await clickProcess();

    // The second tab's three columns, read out of the CSV that tab returned.
    // The first tab has two, so this cannot pass having read the wrong tab.
    await waitFor(() => {
      expect(screen.getByText(/3 detected/)).toBeInTheDocument();
    });

    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(1);
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledWith({
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
      sheetId: SECOND_TAB_GID,
      accessToken: "google-sheets-test-access-token",
    });

    ["county", "residents", "capital"].forEach((columnName) => {
      expect(screen.getAllByText(columnName).length).toBeGreaterThan(0);
    });
  });

  it("never calls the Sheets API route", async () => {
    // Dropping `google-sheets/:id` is what removes this connector's dependency
    // on our own Sheets proxy, and with it the project-global 300 reads per
    // minute quota shared across every tenant. The tab list goes straight to
    // Google on the Picker's per-file grant instead.
    await pickTheSheet();
    await clickProcess();

    await waitFor(() => {
      expect(screen.getByText(/2 detected/)).toBeInTheDocument();
    });

    expect(vi.mocked(APIClient.get).mock.calls).not.toContainEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: "google-sheets/:id" }),
      ]),
    );
    // Positive control: the tab list and the download did happen, so a view
    // that rendered nothing cannot satisfy the assertion above.
    expect(getGoogleSheetTabsMock).toHaveBeenCalledTimes(1);
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(1);
  });

  it("offers every tab and defaults to the first", async () => {
    await pickTheSheet();

    const tabSelect = await waitFor(() => {
      return screen.getByRole("combobox", { name: /tab to import/i });
    });
    expect(tabSelect).toHaveValue(FIRST_TAB);

    const tabOptions = await getImportTabOptions();
    expect(
      tabOptions.map((option) => {
        return option.textContent;
      }),
    ).toEqual([FIRST_TAB, SECOND_TAB]);
  });

  it("shows the preview from the sniff, not from a query of the new table", async () => {
    // The sniff hands back the preview rows already. Asking DuckDB for them
    // instead means selecting from a table named after a dataset the sniff has
    // not materialized yet, so the form's gate never opens: the user is told
    // the rows parsed and then shown nothing. `useGetPreviewData` returning
    // `undefined` is what that looks like, and the form must render anyway.
    useGetPreviewDataMock.mockReturnValue([undefined]);

    await pickTheSheet();
    await clickProcess();

    expect(
      await screen.findByText("First", { exact: false }),
    ).toBeInTheDocument();
  });

  it("names the CSV after the picked sheet and its tab", async () => {
    // The name reaches the parser as the file name and the dataset's default
    // name, so reading it from picker state made the very first import fall
    // back to the placeholder: the mutation closes over the render that ran
    // *before* the pick was recorded. On a second pick the same closure
    // supplies the previous sheet's name, which is worse than a placeholder
    // because it looks correct.
    await pickTheSheet();
    await clickProcess();

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(1);
    });
    expect(startCsvImportMock.mock.calls[0]![0].file.name).toBe(
      `regional-population - ${FIRST_TAB}.csv`,
    );
  });

  it("re-downloads the tab when the form asks for another parse", async () => {
    await pickTheSheet();
    await clickProcess();
    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(1);
    });

    await chooseFormTab(SECOND_TAB);
    // The selection has to land before the re-parse can carry it.
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /^tab$/i })).toHaveValue(
        SECOND_TAB,
      );
    });
    // Choosing a tab only records the choice; the form re-reads on an explicit
    // request, the same as the CSV and XLSX paths.
    await act(async () => {
      screen.getByRole("button", { name: /process data again/i }).click();
    });

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalledTimes(2);
    });

    // A tab is its own download, so the second parse fetches the second tab
    // rather than re-reading bytes held from the first.
    expect(getGoogleSheetTabCsvExportMock).toHaveBeenCalledTimes(2);
    expect(getGoogleSheetTabCsvExportMock.mock.calls[1]![0].sheetId).toBe(
      SECOND_TAB_GID,
    );
    // Positive control on the default: the first download asked for the first
    // tab, so a hard-coded gid cannot satisfy both calls.
    expect(getGoogleSheetTabCsvExportMock.mock.calls[0]![0].sheetId).toBe(
      FIRST_TAB_GID,
    );
    // The superseded local dataset is dropped rather than left behind.
    expect(dropLocalDatasetMock).toHaveBeenCalledTimes(1);
  });

  it("shows no header or rows-to-skip control, which the CSV sniff decides", async () => {
    // A tab arrives as CSV and DuckDB's sniffer detects the header itself, so
    // there is nothing for the user to declare.
    await pickTheSheet();
    await clickProcess();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /^tab$/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByLabelText(/number of rows to skip/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /header row/i }),
    ).not.toBeInTheDocument();
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../GoogleSheetsImportViewTestHelpers");
});

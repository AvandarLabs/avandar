import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, screen, waitFor } from "@/test-utils";
import { GoogleSheetsImportView } from "@/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView";
import {
  TAB_CSV,
  clickProcess,
  dropLocalDatasetMock,
  fixtureTabs,
  getGoogleSheetTabCsvExportMock,
  getGoogleSheetTabsMock,
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

  it("clears the picked document when the user dismisses the Picker", async () => {
    await pickTheSheet();

    await waitFor(() => {
      expect(
        screen.getByText(/Selected document: regional-population/),
      ).toBeInTheDocument();
    });

    if (!googlePickerHarness.onCancel) {
      throw new Error("Expected useGooglePicker to register onCancel.");
    }
    const { onCancel } = googlePickerHarness;
    await act(async () => {
      onCancel();
    });

    expect(
      screen.queryByText(/Selected document: regional-population/),
    ).not.toBeInTheDocument();
    // A dismissal is not a failure, so nothing is announced.
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it("names the failure when Drive refuses the export as too large", async () => {
    const { GoogleDriveError } =
      await import("$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError");
    getGoogleSheetTabCsvExportMock.mockRejectedValue(
      new GoogleDriveError({
        code: "export-too-large",
        status: 403,
        reason: "exportSizeLimitExceeded",
      }),
    );

    await pickTheSheet();
    await clickProcess();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("10 MB"),
        }),
      );
    });
    // The failure is the whole outcome: no form ever renders behind the toast.
    expect(screen.queryByText(/detected/)).not.toBeInTheDocument();
  });

  it("tells the user to re-pick when the per-file grant is gone", async () => {
    const { GoogleDriveError } =
      await import("$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError");
    getGoogleSheetTabsMock.mockRejectedValue(
      new GoogleDriveError({ code: "file-not-accessible", status: 404 }),
    );

    await pickTheSheet();

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Pick the sheet again"),
        }),
      );
    });
  });

  describe("the connect-to-Google button", () => {
    beforeEach(() => {
      // The connect button only renders for a user who has no Google token.
      googlePickerHarness.isGoogleAuthenticated = false;
    });

    it("starts the consent flow for a user with no Google token", async () => {
      // The connector shipped hard-disabled behind a maintenance tooltip, which
      // made the OAuth consent flow unreachable and so made a fresh
      // `drive.file` grant impossible. This is the test that pins it open.
      //
      // There is deliberately no assertion that the maintenance tooltip is
      // gone. Mantine renders a `Tooltip`'s label only on hover, so
      // `queryByText(/under maintenance/i)` finds nothing whether or not the
      // wrapper is there: a mutation that restored the tooltip passed such an
      // assertion. `toBeEnabled` below is the assertion that has teeth, because
      // the tooltip only ever mattered as a carrier for `disabled`.
      renderWithProviders(<GoogleSheetsImportView />);

      const button = screen.getByRole("button", {
        name: /^connect$/i,
      });

      expect(button).toBeEnabled();

      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(navigateToExternalUrlMock).toHaveBeenCalledWith(
          "https://accounts.google.com/o/oauth2/v2/auth?test=1",
        );
      });
    });
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../GoogleSheetsImportViewTestHelpers");
});

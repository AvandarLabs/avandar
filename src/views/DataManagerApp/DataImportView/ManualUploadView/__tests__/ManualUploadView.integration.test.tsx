import { readFileSync } from "node:fs";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, screen, waitFor } from "@/test-utils";
import { ManualUploadView } from "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView";
import {
  covidSampleLoadResult,
  dropLocalDatasetMock,
  FIXTURE_CSV_PATH,
  previewRowsFromCovidSample,
  renderWithProviders,
  requestFileFromUrlMock,
  startCsvImportMock,
} from "../ManualUploadViewTestHelpers";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

describe("ManualUploadView", () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "manual-upload-test@example.com",
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

    dropLocalDatasetMock.mockClear();
    startCsvImportMock.mockClear();
    requestFileFromUrlMock.mockClear();

    startCsvImportMock.mockImplementation(async (params) => {
      const csvName = params.file?.name ?? "fixture.csv";
      const loadResult = covidSampleLoadResult({
        datasetId: params.datasetId,
        csvName,
      });

      return {
        csvSniff: loadResult.csvSniff,
        columns: loadResult.columns,
        previewRows: previewRowsFromCovidSample(),
      };
    });
  });

  it("parses us-covid-sample.csv, infers columns, and reports row count", async () => {
    const csvBuffer = readFileSync(FIXTURE_CSV_PATH);
    const file = new File([csvBuffer], "us-covid-sample.csv", {
      type: "text/csv",
    });

    const { container } = renderWithProviders(<ManualUploadView />);

    const hiddenFileInput = container.querySelector(
      'input[type="file"][accept*="text/csv"]',
    );
    expect(hiddenFileInput).not.toBeNull();

    fireEvent.change(hiddenFileInput!, {
      target: { files: [file] },
    });

    // Choosing the file is the whole gesture: the parse starts on change,
    // with no confirm step in between.
    await waitFor(() => {
      expect(screen.getByText(/6 detected/)).toBeInTheDocument();
    });

    const expectedColumnNames = [
      "Province_State",
      "Admin2",
      "Lat",
      "Long_",
      "date",
      "daily_new_cases",
    ];

    expectedColumnNames.forEach((name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Text").length).toBe(2);
    expect(screen.getAllByText("Decimal").length).toBe(2);
    expect(screen.getAllByText("Whole number").length).toBe(2);
  });

  it("automatically parses the file when initialFile is provided", async () => {
    const csvBuffer = readFileSync(FIXTURE_CSV_PATH);
    const file = new File([csvBuffer], "preloaded.csv", {
      type: "text/csv",
    });

    renderWithProviders(<ManualUploadView initialFile={file} />);

    await waitFor(() => {
      expect(startCsvImportMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/6 detected/)).toBeInTheDocument();
    });
  });

  it("re-enables the file control and clears the reparse spinner after an initialFile sniff finishes", async () => {
    const csvBuffer = readFileSync(FIXTURE_CSV_PATH);
    const file = new File([csvBuffer], "preloaded.csv", {
      type: "text/csv",
    });

    renderWithProviders(
      <StrictMode>
        <ManualUploadView initialFile={file} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText(/6 detected/)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /replace the uploaded file/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Process data again" }),
    ).not.toHaveAttribute("data-loading", "true");
  });

  it("keeps the reparse spinner off the file control", async () => {
    const csvBuffer = readFileSync(FIXTURE_CSV_PATH);
    const file = new File([csvBuffer], "preloaded.csv", {
      type: "text/csv",
    });

    renderWithProviders(<ManualUploadView initialFile={file} />);

    await waitFor(() => {
      expect(screen.getByText(/6 detected/)).toBeInTheDocument();
    });

    startCsvImportMock.mockImplementation(() => {
      return new Promise(() => {
        return undefined;
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Process data again" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Process data again" }),
      ).toHaveAttribute("data-loading", "true");
    });
    expect(
      screen.getByRole("button", { name: /replace the uploaded file/i }),
    ).not.toHaveAttribute("data-loading", "true");
  });

  it("imports a pasted GitHub file link as a dropped file", async () => {
    requestFileFromUrlMock.mockResolvedValue({
      outcome: "file",
      bytes: new Uint8Array([1]),
      fileName: "Main_Routine_Vaccine_Geo.csv",
      mediaType: "text/csv",
      sourceLabel: "GitHub",
    });

    renderWithProviders(<ManualUploadView />);
    fireEvent.change(screen.getByLabelText("Or provide a link to a file"), {
      target: {
        value:
          "https://github.com/nychealth/immunization-data/blob/main/geo/Main_Routine_Vaccine_Geo.csv",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getByText(/6 detected/)).toBeInTheDocument();
    });
    expect(
      screen.getByText("Main_Routine_Vaccine_Geo.csv"),
    ).toBeInTheDocument();
    expect(requestFileFromUrlMock).toHaveBeenCalledWith({
      url: "https://github.com/nychealth/immunization-data/blob/main/geo/Main_Routine_Vaccine_Geo.csv",
    });
  });

  it("refuses a Google Sheet link without downloading it", async () => {
    renderWithProviders(<ManualUploadView />);
    fireEvent.change(screen.getByLabelText("Or provide a link to a file"), {
      target: {
        value: "https://docs.google.com/spreadsheets/d/abc123/edit",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText(/Add it from Connectors/),
    ).toBeInTheDocument();
    expect(requestFileFromUrlMock).not.toHaveBeenCalled();
  });

  it("asks which data file to import when a link holds several", async () => {
    requestFileFromUrlMock.mockResolvedValue({
      outcome: "choice",
      sourceLabel: "GitHub",
      members: [
        { path: "cases.csv", size: 12, mediaType: "text/csv" },
        {
          path: "notes/summary.xlsx",
          size: 40,
          mediaType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    renderWithProviders(<ManualUploadView />);
    fireEvent.change(screen.getByLabelText("Or provide a link to a file"), {
      target: { value: "https://example.com/reports.zip" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Which file should Avandar import?"),
    ).toBeInTheDocument();
    expect(screen.getByText("cases.csv")).toBeInTheDocument();
    expect(screen.getByText("notes/summary.xlsx")).toBeInTheDocument();
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../ManualUploadViewTestHelpers");
});

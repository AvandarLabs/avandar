import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { openFileImportFlow } from "./openFileImportFlow";
import type { ReactElement } from "react";

const { manualUploadViewMock } = vi.hoisted(() => {
  return {
    manualUploadViewMock: vi.fn(),
  };
});

vi.mock(
  "@/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView",
  () => {
    return {
      ManualUploadView: function ManualUploadViewMock(props: {
        initialFile?: File;
        onAfterSave?: () => void;
      }): ReactElement {
        manualUploadViewMock(props);
        return (
          <div
            data-testid="manual-upload-view-mock"
            data-filename={props.initialFile?.name ?? ""}
          >
            <button
              type="button"
              onClick={() => {
                return props.onAfterSave?.();
              }}
            >
              trigger-after-save
            </button>
          </div>
        );
      },
    };
  },
);

function TriggerButton({ file }: { file: File }): ReactElement {
  return (
    <button
      type="button"
      onClick={() => {
        return openFileImportFlow(file);
      }}
    >
      open
    </button>
  );
}

function _createCsvFile(name = "data.csv"): File {
  return new File(["a,b\n1,2"], name, { type: "text/csv" });
}

describe("openFileImportFlow", () => {
  it("shows a confirm dialog asking whether to import the dropped file", async () => {
    const file = _createCsvFile("california.csv");

    render(
      <AvandarUiProvider>
        <TriggerButton file={file} />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("open"));

    expect(
      await screen.findByRole("button", { name: /^import$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^cancel$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/california\.csv/)).toBeInTheDocument();
  });

  it("opens the import modal containing ManualUploadView when the user confirms", async () => {
    const file = _createCsvFile("california.csv");
    manualUploadViewMock.mockClear();

    render(
      <AvandarUiProvider>
        <TriggerButton file={file} />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(
      await screen.findByRole("button", { name: /^import$/i }),
    );

    const manualUploadMock = await screen.findByTestId(
      "manual-upload-view-mock",
    );
    expect(manualUploadMock).toBeInTheDocument();
    expect(manualUploadMock.getAttribute("data-filename")).toBe(
      "california.csv",
    );

    expect(manualUploadViewMock).toHaveBeenCalled();
    const lastCallArgs = manualUploadViewMock.mock.calls.at(-1)?.[0];
    expect(lastCallArgs?.initialFile).toBe(file);
    expect(typeof lastCallArgs?.onAfterSave).toBe("function");
  });

  it("does not open the import modal when the user cancels the confirm dialog", async () => {
    const file = _createCsvFile();

    render(
      <AvandarUiProvider>
        <TriggerButton file={file} />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(
      await screen.findByRole("button", { name: /^cancel$/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("manual-upload-view-mock"),
      ).not.toBeInTheDocument();
    });
  });

  it("closes the import modal when the ManualUploadView fires onAfterSave", async () => {
    const file = _createCsvFile();

    render(
      <AvandarUiProvider>
        <TriggerButton file={file} />
      </AvandarUiProvider>,
    );

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(
      await screen.findByRole("button", { name: /^import$/i }),
    );

    const manualUploadMock = await screen.findByTestId(
      "manual-upload-view-mock",
    );
    expect(manualUploadMock).toBeInTheDocument();

    fireEvent.click(screen.getByText("trigger-after-save"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("manual-upload-view-mock"),
      ).not.toBeInTheDocument();
    });
  });
});

import { I18nProvider } from "@lingui/react";
import { ModalsProvider } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import {
  DEFAULT_MODAL_PROPS,
  MODAL_ROOT_Z_INDEX,
  NUX_CHECKLIST_Z_INDEX,
} from "@/config/Theme";
import { i18n } from "@/i18n/i18n";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
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

function renderImportFlowUi(ui: ReactElement): void {
  render(
    <AvandarAppProvider>
      <I18nProvider i18n={i18n}>
        <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>{ui}</ModalsProvider>
      </I18nProvider>
    </AvandarAppProvider>,
  );
}

function _createCsvFile(name = "data.csv"): File {
  return new File(["a,b\n1,2"], name, { type: "text/csv" });
}

/** Walks up from a node until it finds Mantine's modal stacking variable. */
function _modalZIndex(element: Element): number {
  let node: Element | null = element;
  while (node !== null) {
    const value = getComputedStyle(node)
      .getPropertyValue("--mb-z-index")
      .trim();
    if (value !== "") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    node = node.parentElement;
  }
  throw new Error("Expected an ancestor with --mb-z-index");
}

describe("openFileImportFlow", () => {
  it("shows a confirm dialog asking whether to import the dropped file", async () => {
    const file = _createCsvFile("california.csv");

    renderImportFlowUi(<TriggerButton file={file} />);

    fireEvent.click(screen.getByText("open"));

    expect(
      await screen.findByRole("heading", { name: /Import this file/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /^import$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^cancel$/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/california\.csv/)).toBeInTheDocument();
  });

  it("stacks the confirm dialog above the tour, and keeps the import modal on the modal layer", async () => {
    const file = _createCsvFile();

    renderImportFlowUi(<TriggerButton file={file} />);
    fireEvent.click(screen.getByText("open"));

    const confirmHeading = await screen.findByRole("heading", {
      name: /Import this file/i,
    });
    // Joyride paints its tooltip at `NUX_CHECKLIST_Z_INDEX + 1`.
    expect(_modalZIndex(confirmHeading)).toBeGreaterThan(NUX_CHECKLIST_Z_INDEX);

    fireEvent.click(await screen.findByRole("button", { name: /^import$/i }));
    const importHeading = await screen.findByRole("heading", {
      name: /Import data/i,
    });
    // The import form is a tour target, so this modal must sit on the same
    // layer as the tour. A higher z-index would hide the "Name it and save"
    // tooltip behind the dialog.
    expect(_modalZIndex(importHeading)).toBe(MODAL_ROOT_Z_INDEX);
  });

  it("opens the import modal containing ManualUploadView when the user confirms", async () => {
    const file = _createCsvFile("california.csv");
    manualUploadViewMock.mockClear();

    renderImportFlowUi(<TriggerButton file={file} />);

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(await screen.findByRole("button", { name: /^import$/i }));

    expect(
      screen.queryByTestId("manual-upload-view-mock"),
    ).not.toBeInTheDocument();

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

    renderImportFlowUi(<TriggerButton file={file} />);

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(await screen.findByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(
        screen.queryByTestId("manual-upload-view-mock"),
      ).not.toBeInTheDocument();
    });
  });

  it("closes the import modal when the ManualUploadView fires onAfterSave", async () => {
    const file = _createCsvFile();

    renderImportFlowUi(<TriggerButton file={file} />);

    fireEvent.click(screen.getByText("open"));
    fireEvent.click(await screen.findByRole("button", { name: /^import$/i }));

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

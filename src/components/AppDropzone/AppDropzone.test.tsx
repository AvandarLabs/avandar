import { I18nProvider } from "@lingui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { i18n } from "@/i18n/i18n";
import { AppDropzone } from "./AppDropzone";
import { onAppDropzoneDrop } from "./onAppDropzoneDrop";

const { openFileImportFlowMock } = vi.hoisted(() => {
  return { openFileImportFlowMock: vi.fn() };
});

vi.mock("./openFileImportFlow", () => {
  return {
    openFileImportFlow: openFileImportFlowMock,
  };
});

describe("AppDropzone", () => {
  it("renders its children", () => {
    render(
      <AvandarUiProvider>
        <I18nProvider i18n={i18n}>
          <AppDropzone>
            <div data-testid="dropzone-child">child content</div>
          </AppDropzone>
        </I18nProvider>
      </AvandarUiProvider>,
    );

    expect(screen.getByTestId("dropzone-child")).toHaveTextContent(
      "child content",
    );
  });

  it("delegates the drop handler to openFileImportFlow", () => {
    openFileImportFlowMock.mockClear();
    const file = new File(["a"], "test.csv", { type: "text/csv" });

    onAppDropzoneDrop([file]);

    expect(openFileImportFlowMock).toHaveBeenCalledWith(file);
  });

  it("does not call openFileImportFlow when the drop has no files", () => {
    openFileImportFlowMock.mockClear();

    onAppDropzoneDrop([]);

    expect(openFileImportFlowMock).not.toHaveBeenCalled();
  });
});

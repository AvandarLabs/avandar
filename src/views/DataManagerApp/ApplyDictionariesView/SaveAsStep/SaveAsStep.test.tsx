import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  GENDER,
  LINKED_ONLY_TARGETS,
  makeApplyFlow,
  makeApplyLookups,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { SaveAsStep } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/SaveAsStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const { saveMock } = vi.hoisted(() => {
  return { saveMock: vi.fn() };
});

vi.mock("@/views/DataManagerApp/ApplyDictionariesView/useSaveApply", () => {
  return {
    useSaveApply: () => {
      return [saveMock, false];
    },
  };
});

const DATASET = { id: "dataset-1", name: "Bronx line list" } as Dataset.T;

function _render(flow: ApplyFlow): void {
  render(
    <SaveAsStep
      dataset={DATASET}
      columns={[GENDER]}
      existingBindings={[]}
      flow={flow}
      counts={{ attachedCount: 0, describedCount: 0, usedDictionaryCount: 1 }}
      lookups={makeApplyLookups()}
      summary="1 converted"
      preview={null}
    />,
  );
}

describe("SaveAsStep", () => {
  beforeEach(() => {
    saveMock.mockClear();
  });

  it("creates a linked dataset under a name that says what it holds", () => {
    _render(makeApplyFlow());

    expect(
      screen.getByRole("radio", { name: /Create a new linked dataset/ }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Bronx line list (labeled)",
    );
    expect(
      screen.getByText("Codes become labels in the linked dataset"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Either way, the code lists and descriptions are attached to Bronx line list for reference.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Create linked dataset" }),
    );

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "linked",
        linkedDatasetName: "Bronx line list (labeled)",
      }),
    );
  });

  it("cannot create a linked dataset with no name", () => {
    const flow = makeApplyFlow();
    _render({ ...flow, state: { ...flow.state, linkedDatasetName: "" } });

    expect(
      screen.getByRole("button", { name: "Create linked dataset" }),
    ).toBeDisabled();
  });

  it("says why a linked dataset is unavailable", () => {
    const flow = makeApplyFlow({
      targets: {
        ...LINKED_ONLY_TARGETS,
        linked: { isAvailable: false, reason: "not_admin" },
      },
    });
    _render({ ...flow, state: { ...flow.state, saveTarget: undefined } });

    expect(
      screen.getByRole("radio", { name: /Create a new linked dataset/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Only workspace admins can add datasets, so you can't create a linked dataset.",
      ),
    ).toBeInTheDocument();
  });

  it("waits for the targets instead of offering an update", () => {
    const flow = makeApplyFlow({ targets: undefined });
    _render({ ...flow, state: { ...flow.state, saveTarget: undefined } });

    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText("Update Bronx line list")).toBeNull();
    expect(
      screen.getByRole("status", { name: "Loading save options" }),
    ).toBeInTheDocument();
  });

  it("updates a linked dataset's own conversions without cards", () => {
    const flow = makeApplyFlow({
      targets: { ...LINKED_ONLY_TARGETS, isLinkedDataset: true },
    });
    _render({ ...flow, state: { ...flow.state, saveTarget: undefined } });

    expect(screen.queryByRole("radio")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Update Bronx line list" }),
    );

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "update_linked" }),
    );
  });
});

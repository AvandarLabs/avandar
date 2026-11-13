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
import type { ApplyDictionariesState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";

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

const UPLOAD = {
  id: "dataset-1",
  name: "Bronx line list",
  sourceType: "csv_file",
} as Dataset.T;

function _render(
  options: Readonly<{
    dataset?: Dataset.T;
    inPlace: ApplyTargets["inPlace"];
    state?: Partial<ApplyDictionariesState>;
  }>,
) {
  const flow = makeApplyFlow({
    targets: { ...LINKED_ONLY_TARGETS, inPlace: options.inPlace },
  });
  render(
    <SaveAsStep
      dataset={options.dataset ?? UPLOAD}
      columns={[GENDER]}
      existingBindings={[]}
      flow={{
        ...flow,
        state: { ...flow.state, saveTarget: "in_place", ...options.state },
      }}
      counts={{
        convertedCount: 1,
        attachedCount: 0,
        describedCount: 0,
        usedDictionaryCount: 1,
      }}
      lookups={makeApplyLookups()}
      summary="1 converted"
      preview={null}
    />,
  );
  return flow.dispatch;
}

describe("Change <dataset>", () => {
  beforeEach(() => {
    saveMock.mockClear();
  });

  it("asks before changing a synced upload for the whole workspace", () => {
    const dispatch = _render({
      inPlace: { isAvailable: true, storage: "synced" },
    });

    expect(
      screen.getByRole("radio", { name: /Change Bronx line list/ }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByText(
        "Rewrites the uploaded data in place. It is synced to the workspace, so this changes it for everyone who uses it.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change 1 column" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I understand this changes Bronx line list for the whole workspace",
      }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "set_workspace_change_confirmed",
      isConfirmed: true,
    });
  });

  it("pins the conversions once confirmed", () => {
    _render({
      inPlace: { isAvailable: true, storage: "synced" },
      state: { hasConfirmedWorkspaceChange: true },
    });

    fireEvent.click(screen.getByRole("button", { name: "Change 1 column" }));

    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "in_place" }),
    );
    expect(saveMock.mock.calls[0]?.[0].bindings[0]).toMatchObject({
      isPinned: true,
    });
  });

  it("changes an offline upload without asking", () => {
    _render({ inPlace: { isAvailable: true, storage: "offline" } });

    expect(
      screen.getByText("It is offline only, so nobody else is affected."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Change 1 column" }),
    ).toBeEnabled();
  });

  it("cannot change a live connection", () => {
    _render({
      dataset: { ...UPLOAD, sourceType: "google_sheets" },
      inPlace: {
        isAvailable: false,
        reason: "not_an_upload",
        storage: undefined,
      },
      state: { saveTarget: "linked" },
    });

    expect(
      screen.getByRole("radio", { name: /Change Bronx line list/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Google Sheets data can't be changed from Avandar yet, so a linked dataset is the only option for now.",
      ),
    ).toBeInTheDocument();
  });

  it("cannot change an upload a linked dataset reads", () => {
    _render({
      inPlace: {
        isAvailable: false,
        reason: "has_linked_datasets",
        storage: "synced",
      },
      state: { saveTarget: "linked" },
    });

    expect(
      screen.getByRole("radio", { name: /Change Bronx line list/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "A linked dataset reads Bronx line list, so it can't be changed in place. Convert in the linked dataset instead.",
      ),
    ).toBeInTheDocument();
  });

  it("cannot change a virtual dataset built from other data", () => {
    _render({
      dataset: { ...UPLOAD, sourceType: "virtual" },
      inPlace: {
        isAvailable: false,
        reason: "not_an_upload",
        storage: undefined,
      },
      state: { saveTarget: "linked" },
    });

    expect(
      screen.getByRole("radio", { name: /Change Bronx line list/ }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Bronx line list is built from other data, so a linked dataset is the only option.",
      ),
    ).toBeInTheDocument();
  });

  it("names the save targets by their section title", () => {
    _render({ inPlace: { isAvailable: true, storage: "offline" } });

    expect(
      screen.getByRole("radiogroup", { name: "Save the conversions as" }),
    ).toBeInTheDocument();
  });
});

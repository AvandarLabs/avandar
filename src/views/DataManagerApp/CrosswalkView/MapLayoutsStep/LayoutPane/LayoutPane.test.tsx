import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  CASE_ID_COLUMN,
  columnFill,
  CONTEXT,
  makeDraft,
  ONSET_COLUMN,
  QUEENS_DATE_FORMATS,
  QUEENS_LAYOUT_ID,
  QUEENS_PROFILES,
  withFill,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { LayoutPane } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutPane/LayoutPane";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";

const { useFillExampleMock } = vi.hoisted(() => {
  return { useFillExampleMock: vi.fn() };
});

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample")
      >();
    return { ...original, useFillExample: useFillExampleMock };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useDictionaryNames",
  () => {
    return {
      useDictionaryNames: () => {
        return new Map();
      },
    };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

const VALUES = {
  status: "ready" as const,
  profilesBySourceColumn: QUEENS_PROFILES,
  dateFormatsBySourceColumn: QUEENS_DATE_FORMATS,
  targets: [],
};

/** Case id reads age_mo times a preset factor, onset a custom factor. */
function _draft() {
  const caseIdFill = {
    ...columnFill("age_mo"),
    convert: { kind: "multiply" as const, factor: 12 },
  };
  const onsetFill = {
    ...columnFill("age_mo"),
    convert: { kind: "multiply" as const, factor: 3 },
  };
  const withCaseId = withFill(makeDraft(), {
    layoutId: QUEENS_LAYOUT_ID,
    columnId: CASE_ID_COLUMN.id,
    fill: caseIdFill,
  });
  return {
    draft: withFill(withCaseId, {
      layoutId: QUEENS_LAYOUT_ID,
      columnId: ONSET_COLUMN.id,
      fill: onsetFill,
    }),
    caseIdFill,
    onsetFill,
  };
}

function _pane(
  draft: ReturnType<typeof _draft>["draft"],
  selectedColumnId: CrosswalkColumn.Id | undefined,
) {
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === QUEENS_LAYOUT_ID;
  })!;
  return (
    <LayoutPane
      draft={draft}
      context={CONTEXT}
      layout={layout}
      values={VALUES}
      selectedColumnId={selectedColumnId}
      dispatch={vi.fn()}
    />
  );
}

describe("LayoutPane", () => {
  beforeEach(() => {
    useFillExampleMock.mockReset();
    useFillExampleMock.mockReturnValue(undefined);
  });

  it("shows nothing when no column is selected", () => {
    const { draft } = _draft();
    render(_pane(draft, undefined));

    expect(screen.queryByRole("region")).toBeNull();
  });

  it("starts over for the next column: own-factor choice, typed text, and example", () => {
    const { draft, caseIdFill, onsetFill } = _draft();
    const { rerender } = render(_pane(draft, ONSET_COLUMN.id));

    expect(screen.getByRole("textbox", { name: "Multiply by" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "typed but not saved" },
    });
    expect(useFillExampleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ fill: onsetFill, column: ONSET_COLUMN }),
    );

    rerender(_pane(draft, CASE_ID_COLUMN.id));

    expect(screen.queryByRole("textbox", { name: "Multiply by" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      CASE_ID_COLUMN.name,
    );
    expect(useFillExampleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ fill: caseIdFill, column: CASE_ID_COLUMN }),
    );
  });
});

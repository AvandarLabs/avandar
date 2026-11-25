import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  COUNTY,
  GENDER,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { ApplyDictionariesFlowView } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesFlowView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return vi.fn();
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => {
      return createElement("a", {}, children);
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/useApplyTargets",
  async () => {
    const { LINKED_ONLY_TARGETS: targets } =
      await import("@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures");
    return {
      useApplyTargets: () => {
        return targets;
      },
    };
  },
);
// A matched flow over the real reducer, so steps and the drawer change.
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow",
  async () => {
    const { useReducer: useFlowReducer } = await import("react");
    const fixtures =
      await import("@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures");
    const reducer =
      await import("@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer");
    return {
      useApplyFlow: (): ApplyFlow => {
        const initial = fixtures.makeApplyFlow();
        const [state, dispatch] = useFlowReducer(
          reducer.applyDictionariesReducer,
          initial.state,
        );
        return { ...initial, state, dispatch, isMatching: false };
      },
    };
  },
);
// Each step renders the drawer itself, so a step change remounts it.
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/ApplyStepBody",
  async () => {
    const { createElement } = await import("react");
    return {
      ApplyStepBody: (props: { flow: ApplyFlow; preview: ReactNode }) => {
        return createElement(
          "div",
          { key: props.flow.state.step },
          createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                props.flow.dispatch({ type: "go_to_step", step: "unmatched" });
              },
            },
            "Next step",
          ),
          props.preview,
        );
      },
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows")
      >();
    return {
      ...original,
      usePreviewRows: () => {
        return { status: "ready", result: [] };
      },
    };
  },
);

const DATASET = { id: "dataset-1", name: "Bronx line list" } as Dataset.T;
const DATA = {
  dataset: DATASET,
  columns: [GENDER, COUNTY],
  existingBindings: [],
  matchEntries: [],
  dictionaries: [],
  entries: [],
  codeLists: [],
} as unknown as ApplyDictionariesData;

function _render(): void {
  render(
    <ApplyDictionariesFlowView
      dataset={DATASET}
      data={DATA}
      preselectedDictionaryId={undefined}
    />,
  );
}

describe("ApplyDictionariesFlowView", () => {
  it("focuses the preview when Preview data opens it", () => {
    _render();

    fireEvent.click(screen.getByRole("button", { name: "Preview data" }));

    expect(screen.getByRole("region", { name: "Preview data" })).toHaveFocus();
  });

  it("keeps focus on the new step's heading when the open preview remounts", () => {
    _render();
    fireEvent.click(screen.getByRole("button", { name: "Preview data" }));

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));

    expect(
      screen.getByRole("region", { name: "Preview data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^Unmatched values/ }),
    ).toHaveFocus();
  });
});

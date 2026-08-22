import { describe, expect, it } from "vitest";
import { getVisibleNuxSteps } from "@/components/Nux/tutorials/getVisibleNuxSteps/getVisibleNuxSteps";
import type { NuxStep } from "@/components/Nux/tutorials/NuxTutorial.types";

const ALWAYS: NuxStep = {
  anchor: "explorer-save-menu",
  title: { id: "save-title", message: "Save it to a dashboard" },
  body: { id: "save-body", message: "Open Save." },
  placement: "bottom",
};

const RUN_QUERY_FIRST: NuxStep = {
  ...ALWAYS,
  anchor: "chat-composer",
  title: { id: "query-title", message: "Run a query first" },
  body: {
    id: "query-body",
    message: "You can't save to a dashboard until you've run a query.",
  },
  placement: "top",
  when: "explorerHasNoQueryResults",
};

const ROLE_SELECT: NuxStep = {
  ...ALWAYS,
  anchor: "share-role-select",
  title: { id: "role-title", message: "Pick what they can do" },
  body: { id: "role-body", message: "Viewer is the safe default." },
  when: "generalAccessIsWorkspace",
};

describe("getVisibleNuxSteps", () => {
  it("keeps every step that has no when condition", () => {
    expect(
      getVisibleNuxSteps({
        steps: [ALWAYS],
        facts: {
          explorerHasQueryResults: false,
          generalAccessIsWorkspace: false,
        },
      }),
    ).toEqual([ALWAYS]);
  });

  it("omits the run-a-query-first tooltip once the explorer has results", () => {
    expect(
      getVisibleNuxSteps({
        steps: [RUN_QUERY_FIRST, ALWAYS],
        facts: {
          explorerHasQueryResults: true,
          generalAccessIsWorkspace: false,
        },
      }),
    ).toEqual([ALWAYS]);
  });

  it("keeps the run-a-query-first tooltip when the explorer has no results", () => {
    expect(
      getVisibleNuxSteps({
        steps: [RUN_QUERY_FIRST, ALWAYS],
        facts: {
          explorerHasQueryResults: false,
          generalAccessIsWorkspace: false,
        },
      }),
    ).toEqual([RUN_QUERY_FIRST, ALWAYS]);
  });

  it("omits the workspace role tooltip unless general access is workspace", () => {
    expect(
      getVisibleNuxSteps({
        steps: [ALWAYS, ROLE_SELECT],
        facts: {
          explorerHasQueryResults: false,
          generalAccessIsWorkspace: false,
        },
      }),
    ).toEqual([ALWAYS]);
    expect(
      getVisibleNuxSteps({
        steps: [ALWAYS, ROLE_SELECT],
        facts: {
          explorerHasQueryResults: false,
          generalAccessIsWorkspace: true,
        },
      }),
    ).toEqual([ALWAYS, ROLE_SELECT]);
  });
});

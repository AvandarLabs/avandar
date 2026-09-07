import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import {
  FIRST_DASHBOARD_MILESTONES,
  FIRST_DASHBOARD_SAMPLE_CSV_HREF,
} from "@/components/Nux/tutorials/firstDashboard/firstDashboard";

describe("firstDashboard tutorial", () => {
  it("declares the milestones in the model's order", () => {
    expect(FIRST_DASHBOARD_MILESTONES.map(prop("key"))).toEqual([
      ...NuxProgress.milestoneKeys,
    ]);
  });

  it("gives every milestone at least one tooltip", () => {
    // `nuxActions.completeMilestone` reads `steps.length` to decide whether to
    // advance to a payoff tooltip, so a milestone with no steps would open a
    // tour with nothing in it.
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      expect(milestone.steps.length).toBeGreaterThan(0);
    });
  });

  it("holds thirteen tooltips in chunks of 3, 2, 4, 4", () => {
    expect(
      FIRST_DASHBOARD_MILESTONES.map((milestone) => {
        return milestone.steps.length;
      }),
    ).toEqual([3, 2, 4, 4]);
  });

  it("gives every step resolvable title and body copy", () => {
    FIRST_DASHBOARD_MILESTONES.forEach((milestone) => {
      milestone.steps.forEach((step) => {
        expect(step.title.message).toBeTruthy();
        expect(step.body.message).toBeTruthy();
      });
    });
  });

  it("gives every milestone a distinct completion event", () => {
    const events = FIRST_DASHBOARD_MILESTONES.map(prop("completionEvent"));
    expect(new Set(events).size).toBe(events.length);
  });

  it("locks later milestones until their real outcomes have happened", () => {
    const [addDataset, runQuery, buildDashboard, shareDashboard] =
      FIRST_DASHBOARD_MILESTONES;

    expect(addDataset?.prerequisites).toBeUndefined();
    expect(runQuery?.prerequisites).toEqual(["add_dataset"]);
    expect(buildDashboard?.prerequisites).toEqual(["run_query"]);
    expect(shareDashboard?.prerequisites).toEqual(["build_dashboard"]);
    expect(shareDashboard?.completionEvent).toBe("dashboard.published");
  });

  it("uses people served as the first-question example", () => {
    const justAskStep = FIRST_DASHBOARD_MILESTONES.find((milestone) => {
      return milestone.key === "run_query";
    })?.steps[0];
    expect(justAskStep?.body.message).toContain("people were served");
  });

  it("puts the sample download in the first add_dataset tooltip body", () => {
    const firstStep = FIRST_DASHBOARD_MILESTONES.find((milestone) => {
      return milestone.key === "add_dataset";
    })?.steps[0];
    expect(firstStep?.body.message).toContain("Download our sample");
    expect(firstStep?.bodyLinkHref).toBe(FIRST_DASHBOARD_SAMPLE_CSV_HREF);
  });

  it("places the query-answer tooltip below the canvas top edge while spotlighting the full canvas", () => {
    const answerStep = FIRST_DASHBOARD_MILESTONES.find((milestone) => {
      return milestone.key === "run_query";
    })?.steps[1];
    expect(answerStep?.anchor).toBe("explorer-canvas-tooltip");
    expect(answerStep?.spotlightAnchor).toBe("explorer-canvas");
    expect(answerStep?.placement).toBe("bottom");
    expect(answerStep?.hideCaret).toBe(true);
  });

  it("gates every step that is not a payoff until its real outcome", () => {
    const [addDataset, runQuery, buildDashboard, shareDashboard] =
      FIRST_DASHBOARD_MILESTONES;

    expect(addDataset?.steps[0]?.disableNextUntilAnchor).toBe(
      "dataset-import-form",
    );
    expect(addDataset?.steps[1]?.disableNextUntilEvent).toBe("dataset.saved");
    expect(addDataset?.steps[2]?.disableNextUntilAnchor).toBeUndefined();
    expect(addDataset?.steps[2]?.disableNextUntilEvent).toBe(
      "dataset.summaryOpened",
    );
    expect(addDataset?.steps[2]?.scrollParentToTop).toBe(true);
    expect(addDataset?.steps[2]?.hideBack).toBe(true);

    expect(runQuery?.steps[0]?.openChatPanel).toBe(true);
    expect(runQuery?.steps[0]?.disableNextUntilEvent).toBe("query.succeeded");
    expect(runQuery?.steps[1]?.openChatPanel).toBeUndefined();
    expect(runQuery?.steps[1]?.disableNextUntilEvent).toBeUndefined();

    expect(buildDashboard?.steps[0]?.anchor).toBe("chat-composer");
    expect(buildDashboard?.steps[0]?.placement).toBe("top");
    expect(buildDashboard?.steps[0]?.openChatPanel).toBe(true);
    expect(buildDashboard?.steps[0]?.when).toBe("explorerHasNoQueryResults");
    expect(buildDashboard?.steps[0]?.disableNextUntilEvent).toBe(
      "query.succeeded",
    );
    expect(buildDashboard?.steps[0]?.title.message).toMatch(/query first/i);
    expect(buildDashboard?.steps[0]?.body.message).toMatch(
      /can't save to a dashboard/i,
    );

    expect(buildDashboard?.steps[1]?.anchor).toBe("explorer-save-menu");
    expect(buildDashboard?.steps[1]?.disableNextUntilAnchor).toBe(
      "explorer-save-to-dashboard-item",
    );
    expect(buildDashboard?.steps[1]?.disableNextUntilEvent).toBeUndefined();
    expect(buildDashboard?.steps[2]?.anchor).toBe(
      "explorer-save-to-dashboard-item",
    );
    expect(buildDashboard?.steps[2]?.disableNextUntilAnchor).toBe(
      "explorer-save-to-dashboard-modal",
    );
    expect(buildDashboard?.steps[3]?.anchor).toBe(
      "explorer-create-dashboard-button",
    );
    expect(buildDashboard?.steps[3]?.spotlightAnchor).toBe(
      "explorer-save-to-dashboard-modal",
    );
    expect(buildDashboard?.steps[3]?.disableNextUntilEvent).toBe(
      "dashboard.created",
    );
    expect(buildDashboard?.steps[3]?.hideBack).toBe(true);

    expect(shareDashboard?.steps[0]?.disableNextUntilAnchor).toBe(
      "general-access-select",
    );
    expect(shareDashboard?.steps[0]?.disableNextUntilEvent).toBeUndefined();
    expect(shareDashboard?.steps[1]?.disableNextUntilEvent).toBeUndefined();
    expect(shareDashboard?.steps[2]?.when).toBe("generalAccessIsWorkspace");
    expect(shareDashboard?.steps[2]?.disableNextUntilEvent).toBeUndefined();
    expect(shareDashboard?.steps[3]?.anchor).toBe("dashboard-publish-button");
    expect(shareDashboard?.steps[3]?.disableNextUntilEvent).toBe(
      "dashboard.published",
    );
    expect(shareDashboard?.steps[3]?.hideBack).toBe(true);
    expect(shareDashboard?.steps[3]?.title.message).toMatch(/publish/i);
  });

  it("ships a people-served sample at the download href", () => {
    const relativePath = join(
      "public",
      FIRST_DASHBOARD_SAMPLE_CSV_HREF.replace(/^\//, ""),
    );
    const csv = readFileSync(join(process.cwd(), relativePath), "utf8");
    const [header, ...rows] = csv.trimEnd().split("\n");
    expect(header).toBe("service_date,program,region,people_served,sessions");
    expect(rows).toHaveLength(200);
  });
});

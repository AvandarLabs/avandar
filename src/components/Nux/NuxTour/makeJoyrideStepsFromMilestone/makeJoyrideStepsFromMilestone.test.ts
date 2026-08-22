import { i18n } from "@lingui/core";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { makeJoyrideStepsFromMilestone } from "@/components/Nux/NuxTour/makeJoyrideStepsFromMilestone/makeJoyrideStepsFromMilestone";
import {
  FIRST_DASHBOARD_MILESTONES,
  FIRST_DASHBOARD_SAMPLE_CSV_HREF,
} from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { render, screen } from "@/test-utils";
import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";
import type { ReactElement } from "react";
import type { Step } from "react-joyride";

const _LAID_OUT_RECT = {
  x: 100,
  y: 40,
  top: 40,
  left: 100,
  bottom: 72,
  right: 180,
  width: 80,
  height: 32,
  toJSON: () => {
    return {};
  },
};

function _appendLaidOut(anchor: NuxAnchor): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("data-nux", anchor);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(_LAID_OUT_RECT);
  document.body.append(element);
  return element;
}

function _getElementFromTarget(
  target: Step["target"] | undefined,
): HTMLElement | null {
  if (typeof target !== "function") {
    return null;
  }
  return target() as HTMLElement | null;
}

beforeAll(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("makeJoyrideStepsFromMilestone", () => {
  it("maps every step to its laid-out anchor", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    const uploadForm = _appendLaidOut("dataset-upload-form");
    expect(steps).toHaveLength(3);
    expect(_getElementFromTarget(steps[0]!.target)).toBe(uploadForm);
  });

  it("passes each step's own target wait timeout through", () => {
    const addDataset = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({
      milestone: addDataset,
      i18n,
    });
    expect(steps[0]!.targetWaitTimeout).toBe(60_000);
  });

  it("renders a body link as a downloadable anchor in the step content", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    render(steps[0]!.content as ReactElement);
    const link = screen.getByRole("link", { name: "Download our sample" });
    expect(link).toHaveAttribute("href", FIRST_DASHBOARD_SAMPLE_CSV_HREF);
    expect(link).toHaveAttribute("download");
  });

  it("gates Next on the first add_dataset step until the import form exists", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    expect(steps[0]!.data).toEqual({
      disableNextUntilAnchor: "dataset-import-form",
    });
  });

  it("gates Next on the save step until the dataset is actually saved", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    expect(steps[1]!.data).toMatchObject({
      disableNextUntilEvent: "dataset.saved",
    });
  });

  it("fixes every tooltip so a flipped placement cannot grow the page", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    steps.forEach((step) => {
      expect(step.isFixed).toBe(true);
    });
  });

  it("maps spotlightAnchor to Joyride spotlightTarget", () => {
    const runQuery = FIRST_DASHBOARD_MILESTONES[1]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone: runQuery, i18n });
    const tooltipHook = _appendLaidOut("explorer-canvas-tooltip");
    const canvas = _appendLaidOut("explorer-canvas");
    expect(_getElementFromTarget(steps[1]!.target)).toBe(tooltipHook);
    expect(_getElementFromTarget(steps[1]!.spotlightTarget)).toBe(canvas);
  });

  it("spotlights the save modal while the tooltip sits on Create dashboard and save", () => {
    const buildDashboard = FIRST_DASHBOARD_MILESTONES[2]!;
    const steps = makeJoyrideStepsFromMilestone({
      milestone: buildDashboard,
      i18n,
    });
    const createButton = _appendLaidOut("explorer-create-dashboard-button");
    const saveModal = _appendLaidOut("explorer-save-to-dashboard-modal");
    const createStep = steps.find((step) => {
      return _getElementFromTarget(step.target) === createButton;
    });
    expect(_getElementFromTarget(createStep?.spotlightTarget)).toBe(saveModal);
    expect(createStep?.data).toMatchObject({
      disableNextUntilEvent: "dashboard.created",
      hideBack: true,
    });
  });

  it("does not forward step.when onto the Joyride step", () => {
    const buildDashboard = FIRST_DASHBOARD_MILESTONES[2]!;
    const steps = makeJoyrideStepsFromMilestone({
      milestone: buildDashboard,
      i18n,
    });
    expect(steps[0]).not.toHaveProperty("when");
  });

  it("skips Joyride's animated scroll on the step that resets the Data Sources pane", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    expect(steps[2]!.skipScroll).toBe(true);
    expect(steps[0]!.skipScroll).toBeUndefined();
    expect(steps[1]!.skipScroll).toBeUndefined();
  });

  it("hides Back on the payoff tooltip after saving a dataset", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    expect(steps[2]!.data).toMatchObject({ hideBack: true });
  });

  it("hides the caret when hideCaret is set", () => {
    const runQuery = FIRST_DASHBOARD_MILESTONES[1]!;
    const steps = makeJoyrideStepsFromMilestone({ milestone: runQuery, i18n });
    expect(steps[1]!.floatingOptions).toEqual({ hideArrow: true });
    expect(steps[0]!.floatingOptions).toBeUndefined();
  });

  it("forwards Joyride step options such as scrollOffset onto the Joyride step", () => {
    const addDataset = FIRST_DASHBOARD_MILESTONES[0]!;
    const milestone = {
      ...addDataset,
      steps: [{ ...addDataset.steps[0]!, scrollOffset: 48 }],
    };
    const steps = makeJoyrideStepsFromMilestone({ milestone, i18n });
    expect(steps[0]!.scrollOffset).toBe(48);
  });
});

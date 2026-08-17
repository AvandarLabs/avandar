import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import { buildJoyrideSteps } from "@/components/Nux/NuxTour/buildJoyrideSteps";

beforeAll(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("buildJoyrideSteps", () => {
  it("maps every step to its anchor selector", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[0]!;
    const steps = buildJoyrideSteps({ milestone, i18n });
    expect(steps).toHaveLength(3);
    expect(steps[0]!.target).toBe('[data-nux="dataset-upload-form"]');
  });

  it("passes each step's own target wait timeout through", () => {
    const milestone = FIRST_DASHBOARD_MILESTONES[2]!;
    const steps = buildJoyrideSteps({ milestone, i18n });
    // The viz-tab step declares no override, so it keeps Joyride's default.
    expect(steps[0]!.targetWaitTimeout).toBeUndefined();
    expect(steps[1]!.targetWaitTimeout).toBe(60_000);
  });
});

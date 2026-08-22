import { describe, expect, it, vi } from "vitest";

import { restartFirstDashboardTutorial } from "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial";

describe("restartFirstDashboardTutorial", () => {
  it("wipes progress then opens add_dataset, not Home", () => {
    const restart = vi.fn();
    const openMilestone = vi.fn();
    restartFirstDashboardTutorial({ restart, openMilestone });
    expect(restart).toHaveBeenCalledTimes(1);
    expect(openMilestone).toHaveBeenCalledTimes(1);
    expect(openMilestone).toHaveBeenCalledWith("add_dataset");
    expect(restart.mock.invocationCallOrder[0]).toBeLessThan(
      openMilestone.mock.invocationCallOrder[0] ?? 0,
    );
  });
});

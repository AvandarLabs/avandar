import {
  FIRST_DASHBOARD_TUTORIAL_KEY,
  NUX_MILESTONE_KEYS,
} from "$/models/Nux/NuxProgress.constants.ts";
import { describe, expect, it } from "vitest";

describe("NuxProgress constants", () => {
  it("declares the four milestones in tutorial order", () => {
    expect(NUX_MILESTONE_KEYS).toEqual([
      "add_dataset",
      "run_query",
      "build_dashboard",
      "share_dashboard",
    ]);
  });

  it("names the only tutorial that ships", () => {
    expect(FIRST_DASHBOARD_TUTORIAL_KEY).toBe("first_dashboard");
  });
});

import { describe, expect, it, vi } from "vitest";
import { dismissNuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/dismissNuxChecklistPanel/dismissNuxChecklistPanel";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

const ALL_MILESTONES: readonly NuxProgress.MilestoneKey[] = [
  "add_dataset",
  "run_query",
  "build_dashboard",
  "share_dashboard",
];

describe("dismissNuxChecklistPanel", () => {
  it("dismisses immediately when every milestone is already complete", () => {
    const dismiss = vi.fn();
    const confirm = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: ALL_MILESTONES,
      dismiss,
      confirm,
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks for confirmation when the tutorial is unfinished", () => {
    const dismiss = vi.fn();
    const confirm = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: ["add_dataset"],
      dismiss,
      confirm,
    });
    expect(dismiss).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(1);
    const onConfirm = confirm.mock.calls[0]?.[0] as () => void;
    onConfirm();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss when confirmation is not accepted", () => {
    const dismiss = vi.fn();
    dismissNuxChecklistPanel({
      completedMilestones: [],
      dismiss,
      confirm: () => {
        return;
      },
    });
    expect(dismiss).not.toHaveBeenCalled();
  });
});

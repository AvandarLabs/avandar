import { describe, expect, it } from "vitest";
import { formatDashboardCardLine } from "$/agent/dashboardBlocks/dashboardCardLine.ts";

const identity = (text: string): string => {
  return text;
};

describe("formatDashboardCardLine", () => {
  it("says a confirmed block was added, masking the name", () => {
    expect(
      formatDashboardCardLine(
        { kind: "confirmed", dashboardName: "Kings deaths", isUnsaved: false },
        (text) => {
          return text.replace("Kings", "<value 1>");
        },
      ),
    ).toBe(
      '<dashboard_card>Confirmed: added to "<value 1> deaths".</dashboard_card>',
    );
  });

  it("says when the block went into the open editor unsaved", () => {
    expect(
      formatDashboardCardLine(
        { kind: "confirmed", dashboardName: "COVID 2022", isUnsaved: true },
        identity,
      ),
    ).toBe(
      '<dashboard_card>Confirmed: added to "COVID 2022" in the open editor, not saved yet.</dashboard_card>',
    );
  });

  it("says a cancelled card added nothing", () => {
    expect(formatDashboardCardLine({ kind: "cancelled" }, identity)).toBe(
      "<dashboard_card>Cancelled: nothing was added.</dashboard_card>",
    );
  });
});

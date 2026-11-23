import { describeCiStatus } from "@ava-cli/ReleaseCli/describeCiStatus/describeCiStatus";
import { describe, expect, it } from "vitest";
import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";

const RUN_URL = "https://github.com/x/y/actions/runs/1";

/** One status of each kind, with what is printed for it. */
const CI_STATUS_CASES: Array<{
  status: CiStatus;
  expected: string;
}> = [
  {
    status: { kind: "passed", url: RUN_URL },
    expected: "Staging CI passed.",
  },
  {
    status: { kind: "failed", conclusion: "failure", url: RUN_URL },
    expected: `Staging CI did not pass (failure): ${RUN_URL}`,
  },
  {
    status: { kind: "pending", status: "in_progress", url: RUN_URL },
    expected: `Staging CI has not finished (in_progress): ${RUN_URL}`,
  },
  {
    status: { kind: "missing" },
    expected: "No staging CI run was found for this commit.",
  },
  {
    status: { kind: "unknown", reason: "gh is not installed" },
    expected: "Could not check staging CI: gh is not installed",
  },
];

describe("describeCiStatus", () => {
  it.each(CI_STATUS_CASES)(
    "keeps the staging CI wording for a $status.kind verdict",
    ({ status, expected }) => {
      expect(describeCiStatus(status)).toBe(expected);
    },
  );
});

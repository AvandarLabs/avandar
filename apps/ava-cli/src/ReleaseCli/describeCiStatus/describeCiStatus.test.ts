import { describeCiStatus } from "@ava-cli/ReleaseCli/describeCiStatus/describeCiStatus";
import { MAINLINE_RELEASE_LINE } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { describe, expect, it } from "vitest";
import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";

const RUN_URL = "https://github.com/x/y/actions/runs/1";

/** One status of each kind, with what the mainline prints for it. */
const CI_STATUS_CASES: Array<{
  status: CiStatus;
  mainline: string;
}> = [
  {
    status: { kind: "passed", url: RUN_URL },
    mainline: "Staging CI passed.",
  },
  {
    status: { kind: "failed", conclusion: "failure", url: RUN_URL },
    mainline: `Staging CI did not pass (failure): ${RUN_URL}`,
  },
  {
    status: { kind: "pending", status: "in_progress", url: RUN_URL },
    mainline: `Staging CI has not finished (in_progress): ${RUN_URL}`,
  },
  {
    status: { kind: "missing" },
    mainline: "No staging CI run was found for this commit.",
  },
  {
    status: { kind: "unknown", reason: "gh is not installed" },
    mainline: "Could not check staging CI: gh is not installed",
  },
];

describe("describeCiStatus", () => {
  it.each(CI_STATUS_CASES)(
    "keeps the mainline wording for a $status.kind verdict",
    ({ status, mainline }) => {
      expect(describeCiStatus({ status, line: MAINLINE_RELEASE_LINE })).toBe(
        mainline,
      );
    },
  );
});

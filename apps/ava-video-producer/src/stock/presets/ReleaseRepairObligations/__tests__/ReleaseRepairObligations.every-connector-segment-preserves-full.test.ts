import test from "node:test";
import { assertReleaseConnectorClearance } from "../assertReleaseConnectorClearance";
import { fixtures } from "../ReleaseRepairObligations.fixtures";
import { inputSchema, type Input } from "../ReleaseRepairObligations.schema";
import { render } from "./ReleaseRepairObligationsTestHelpers";

test("every connector segment preserves full dense labels along the tab-to-register route", () => {
  const cases = [
    fixtures[2].input,
    {
      ...fixtures[2].input,
      issues: fixtures[2].input.issues.map((issue, index) => ({
        ...issue,
        state: index === 0 ? ("resolved" as const) : issue.state,
      })),
    },
  ];
  cases.forEach((baseInput) =>
    [true, false].forEach((showResolvedIssues) =>
      ["tabs", "margin-notches"].forEach((issueMarks) =>
        [50, 65, 80, 89].forEach((frame) => {
          const input: Input = {
            ...baseInput,
            showResolvedIssues,
            issueMarks: issueMarks as Input["issueMarks"],
            artifact: {
              ...baseInput.artifact,
              label: `界 ${"界".repeat(17)} ${"界".repeat(28)}`.slice(0, 28),
            },
            issues: baseInput.issues.map((issue) => ({
              ...issue,
              label: `界 ${"界".repeat(17)} ${"界".repeat(28)}`.slice(0, 28),
            })),
          };
          assertReleaseConnectorClearance(
            render({ frame: frame, input: inputSchema.parse(input) }),
          );
        }),
      ),
    ),
  );
});

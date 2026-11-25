import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../ResidentBudgetBallots.fixtures";
import { type Input } from "../../ResidentBudgetBallots.schema";
import { assertConcentratedPapersPreserveIdentitiesPapers as _assertConcentratedPapersPreserveIdentitiesPapers } from "./assertConcentratedPapersPreserveIdentitiesPapers";
import { ResidentBallotTestHelpers } from "./ResidentBallotTestHelpers";

/**
 * Asserts concentrated papers preserve all identities and disjoint final
 * envelopes.
 */
export function assertConcentratedPapersPreserveIdentitiesProjectId({
  projectId,
  tallyArrangement,
}: Readonly<{
  projectId: Input["ballots"][number]["projectId"];
  tallyArrangement: "stacks" | "rows";
}>): void {
  const input = {
    ...fixtures[2].input,
    tallyArrangement,
    ballots: Array.from({ length: 8 }, (_, index) => {
      return { id: `${"界".repeat(14)}${index}`, projectId };
    }),
  };
  const hold = ResidentBallotTestHelpers.render({ frame: 150, input });
  const papers = [...hold.matchAll(/<rect data-paper="[^"]*"[^>]*>/g)].map(
    ([attributes]) => {
      return {
        x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
        y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
        width: SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
        height: SvgAttributes.getNumberFromMarkup({
          attributes,
          name: "height",
        }),
      };
    },
  );
  _assertConcentratedPapersPreserveIdentitiesPapers({
    papers,
    input,
    hold,
    projectId,
  });
}

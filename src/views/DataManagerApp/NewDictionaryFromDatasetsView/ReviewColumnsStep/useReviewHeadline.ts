import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";

/**
 * The Review step's one-line account of what reading did, such as "12
 * columns from 2 datasets became 9 entries". From one dataset's menu it
 * names that dataset instead of counting datasets.
 */
export function useReviewHeadline(
  proposal: DictionaryProposal.T,
  originDatasetName: string | undefined,
): string {
  const { t } = useLingui();
  const columnCount = proposal.entries.reduce((sum, entry) => {
    return sum + DictionaryProposal.getColumns(entry).length;
  }, 0);
  const entryCount = proposal.entries.length;
  const datasetCount = DictionaryProposal.getDatasetIds(proposal).length;
  const columns = plural(columnCount, { one: "# column", other: "# columns" });
  const entries = plural(entryCount, { one: "# entry", other: "# entries" });
  const datasets = plural(datasetCount, {
    one: "# dataset",
    other: "# datasets",
  });
  return originDatasetName
    ? t`${columns} in ${originDatasetName} became ${entries}.`
    : t`${columns} from ${datasets} became ${entries}.`;
}

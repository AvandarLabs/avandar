import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { ReviewEntriesSection } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesSection";
import {
  getReviewSectionFromKind,
  getSharedNamesByEntryKey,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/reviewSectionHelpers";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ReviewSection } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/reviewSectionHelpers";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  dispatch: Dispatch<NewDictionaryAction>;
};

function _formatEntryCount(entryCount: number): string {
  return plural(entryCount, { one: "# entry", other: "# entries" });
}

/**
 * The Review step's three groups of proposed entries: coded columns,
 * ordered scales, and description-only entries. A group with no entries
 * is not shown.
 */
export function ReviewSections({
  proposal,
  nameIssues,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sharedNamesByEntryKey = useMemo(() => {
    return getSharedNamesByEntryKey(proposal);
  }, [proposal]);
  const entriesIn = (section: ReviewSection) => {
    return proposal.entries.filter((entry) => {
      return getReviewSectionFromKind(entry.kind) === section;
    });
  };
  const coded = entriesIn("coded");
  const ordered = entriesIn("ordered");
  const described = entriesIn("description");
  const codedCount = _formatEntryCount(coded.length);
  const orderedCount = _formatEntryCount(ordered.length);
  const describedCount = _formatEntryCount(described.length);
  const sectionProps = {
    sharedNamesByEntryKey,
    nameIssues,
    isSingleDataset: DictionaryProposal.getDatasetIds(proposal).length === 1,
    dispatch,
  };

  return (
    <>
      <ReviewEntriesSection
        title={t`Coded columns`}
        meta={t`${codedCount} · you'll label their values next`}
        entries={coded}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Ordered scales`}
        meta={t`${orderedCount} · order is kept when charted`}
        entries={ordered}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Descriptions only`}
        meta={t`${describedCount} · no codes to label`}
        entries={described}
        {...sectionProps}
      />
    </>
  );
}

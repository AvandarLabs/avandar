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

type ReviewTexts = { title: string; meta: string };

type Props = {
  proposal: DictionaryProposal.T;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  dispatch: Dispatch<NewDictionaryAction>;
};

function _formatEntryCount(entryCount: number): string {
  return plural(entryCount, { one: "# entry", other: "# entries" });
}

/** The title and meta line of each group, given its entry count as text. */
function useSectionTextsGetter(): (
  section: ReviewSection,
  count: string,
) => ReviewTexts {
  const { t } = useLingui();
  return (section, count) => {
    switch (section) {
      case "coded":
        return {
          title: t`Columns to map`,
          meta: t`${count} · you'll map their values next`,
        };
      case "ordered":
        return {
          title: t`Ordered scales`,
          meta: t`${count} · order is kept when charted`,
        };
      case "description":
        return {
          title: t`Descriptions only`,
          meta: t`${count} · no values to map`,
        };
    }
  };
}

const SECTIONS: readonly ReviewSection[] = ["coded", "ordered", "description"];

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
  const getSectionTexts = useSectionTextsGetter();
  const sharedNamesByEntryKey = useMemo(() => {
    return getSharedNamesByEntryKey(proposal);
  }, [proposal]);
  const isSingleDataset =
    DictionaryProposal.getDatasetIds(proposal).length === 1;

  return (
    <>
      {SECTIONS.map((section) => {
        const entries = proposal.entries.filter((entry) => {
          return getReviewSectionFromKind(entry.kind) === section;
        });
        const { title, meta } = getSectionTexts(
          section,
          _formatEntryCount(entries.length),
        );
        return (
          <ReviewEntriesSection
            key={section}
            title={title}
            meta={meta}
            entries={entries}
            sharedNamesByEntryKey={sharedNamesByEntryKey}
            nameIssues={nameIssues}
            isSingleDataset={isSingleDataset}
            dispatch={dispatch}
          />
        );
      })}
    </>
  );
}

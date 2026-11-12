import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { ReviewEntriesSection } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesSection";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  dispatch: Dispatch<NewDictionaryAction>;
};

type ReviewSection = "coded" | "ordered" | "description";

function _getSection(kind: DataDictionaryEntry.Kind): ReviewSection {
  if (kind === "categorical") {
    return "coded";
  }
  return kind === "ordered" ? "ordered" : "description";
}

/** For each entry on a shared code list, the other entries on it. */
function _getSharedNamesByEntryKey(
  proposal: DictionaryProposal.T,
): Map<string, string[]> {
  const namesByKey = new Map(
    proposal.entries.map((entry) => {
      return [entry.key, entry.name];
    }),
  );
  const shared = new Map<string, string[]>();
  DictionaryProposal.getCodings(proposal)
    .codeLists.filter((codeList) => {
      return codeList.entryKeys.length > 1;
    })
    .forEach((codeList) => {
      codeList.entryKeys.forEach((entryKey) => {
        const others = codeList.entryKeys.filter((other) => {
          return other !== entryKey;
        });
        shared.set(
          entryKey,
          others.flatMap((other) => {
            return namesByKey.get(other) ?? [];
          }),
        );
      });
    });
  return shared;
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
    return _getSharedNamesByEntryKey(proposal);
  }, [proposal]);
  const entriesIn = (section: ReviewSection) => {
    return proposal.entries.filter((entry) => {
      return _getSection(entry.kind) === section;
    });
  };
  const coded = entriesIn("coded");
  const ordered = entriesIn("ordered");
  const described = entriesIn("description");
  const codedCount = coded.length;
  const orderedCount = ordered.length;
  const describedCount = described.length;
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
        meta={t`${plural(codedCount, { one: "# entry", other: "# entries" })} · you'll label their values next`}
        entries={coded}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Ordered scales`}
        meta={t`${plural(orderedCount, { one: "# entry", other: "# entries" })} · order is kept when charted`}
        entries={ordered}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Descriptions only`}
        meta={t`${plural(describedCount, { one: "# entry", other: "# entries" })} · no codes to label`}
        entries={described}
        {...sectionProps}
      />
    </>
  );
}

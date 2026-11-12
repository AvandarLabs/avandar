import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

type DictionaryCopy = {
  /** Each entry kind's label and its one-line explanation. */
  kindLabels: Record<DataDictionaryEntry.Kind, string>;
  /** Each entry kind's name alone, for a table cell. */
  kindShortLabels: Record<DataDictionaryEntry.Kind, string>;
  /** What one draft issue means, as shown beside the field it is about. */
  describeIssue: (issue: DataDictionary.DraftIssue) => string;
  /** What a save refusal means, or a generic failure for anything else. */
  describeSaveError: (error: unknown) => string;
};

/** Translated copy for the Dictionary view's kinds, issues, and errors. */
export function useDictionaryCopy(): DictionaryCopy {
  const { t } = useLingui();
  return useMemo((): DictionaryCopy => {
    const kindLabels: Record<DataDictionaryEntry.Kind, string> = {
      categorical: t`Categorical: named groups, such as sex or outcome`,
      ordered: t`Ordered: levels with an order, such as low to high`,
      number: t`Number: a measurement or a count`,
      date: t`Date`,
      text: t`Text`,
      identifier: t`Identifier: unique to each row, such as a case number`,
    };
    const kindShortLabels: Record<DataDictionaryEntry.Kind, string> = {
      categorical: t`Categorical`,
      ordered: t`Ordered`,
      number: t`Number`,
      date: t`Date`,
      text: t`Text`,
      identifier: t`Identifier`,
    };
    const issueCopy: Record<DataDictionary.DraftIssue["type"], string> = {
      entry_name_required: t`Give this entry a name.`,
      entry_name_not_unique: t`Another entry already has this name.`,
      entry_range_invalid: t`The lowest valid value is above the highest.`,
      entry_primary_required: t`Pick the code list this entry uses.`,
      code_list_name_required: t`Give this code list a name.`,
      code_pair_incomplete: t`Every value needs a code and a label.`,
      code_not_unique: t`This code is already in the list. Codes are matched ignoring capitalization.`,
      label_not_unique: t`Another value in this list already uses this label or spelling.`,
    };
    return {
      kindLabels,
      kindShortLabels,
      describeIssue: (issue) => {
        return issueCopy[issue.type];
      },
      describeSaveError: (error) => {
        const hint = DataDictionary.toSaveErrorHint(error);
        if (hint === "dictionary_editor_required") {
          return t`You need edit access to Data Sources to change this dictionary.`;
        }
        return hint
          ? t`The dictionary was not saved. Check the highlighted fields and try again.`
          : t`The dictionary was not saved. Please try again.`;
      },
    };
  }, [t]);
}

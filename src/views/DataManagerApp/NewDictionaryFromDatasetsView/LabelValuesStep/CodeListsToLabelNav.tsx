import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { CodeListNavLink } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListNavLink";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import type { ReactNode } from "react";

type Props = {
  codeLists: readonly DictionaryProposal.CodeList[];
  labels: DictionaryProposal.Labels;
  selectedKey: string;
  onSelect: (codeListKey: string) => void;
};

/**
 * The flank of the Map values step: every code list waiting to be mapped,
 * with how far along each one is and how many are done. It is full height,
 * on the body surface, and outside the content column's gutter.
 */
export function CodeListsToLabelNav({
  codeLists,
  labels,
  selectedKey,
  onSelect,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const doneCount = codeLists.filter((codeList) => {
    return DictionaryProposal.getCodeListStatus(labels, codeList) === "labeled";
  }).length;
  const listCount = codeLists.length;
  const progress = plural(listCount, {
    one: `${doneCount} of # done`,
    other: `${doneCount} of # done`,
  });

  return (
    <nav aria-label={t`Code lists to map`} className={css.labelValuesStepNav}>
      <div className={css.labelValuesStepNavHeader}>
        <Text component="h3" fz="sm" fw={600}>
          {t`Code lists to map`}
        </Text>
        <Text size="xs" c="dimmed">
          {progress}
        </Text>
      </div>
      <Stack gap={2} className={css.labelValuesStepNavList}>
        {codeLists.map((codeList) => {
          return (
            <CodeListNavLink
              key={codeList.key}
              codeList={codeList}
              labels={labels}
              isSelected={codeList.key === selectedKey}
              onSelect={onSelect}
            />
          );
        })}
      </Stack>
    </nav>
  );
}

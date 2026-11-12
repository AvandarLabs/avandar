import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { NavLink, Stack, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { CodeListStatusBadge } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListStatusBadge";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import type { ReactNode } from "react";

type Props = {
  codeLists: readonly DictionaryProposal.CodeList[];
  labels: DictionaryProposal.Labels;
  selectedKey: string;
  onSelect: (codeListKey: string) => void;
};

/** Every code list waiting for labels, with how far along each one is. */
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

  return (
    <nav aria-label={t`Code lists to label`} className={css.labelValuesStepNav}>
      <Text size="xs" c="dimmed" fw={600} px="xs" pb="xs">
        {t`${doneCount} of ${listCount} done`}
      </Text>
      <Stack gap={2}>
        {codeLists.map((codeList) => {
          const valueCount = codeList.values.length;
          const isSelected = codeList.key === selectedKey;
          return (
            <NavLink
              key={codeList.key}
              component="button"
              type="button"
              active={isSelected}
              aria-current={isSelected ? "true" : undefined}
              label={codeList.name}
              description={
                codeList.isOrdered
                  ? t`${plural(valueCount, { one: "# value", other: "# values" })} · ordered`
                  : t`${plural(valueCount, { one: "# value", other: "# values" })}`
              }
              rightSection={
                <CodeListStatusBadge
                  status={DictionaryProposal.getCodeListStatus(
                    labels,
                    codeList,
                  )}
                />
              }
              onClick={() => {
                onSelect(codeList.key);
              }}
            />
          );
        })}
      </Stack>
    </nav>
  );
}

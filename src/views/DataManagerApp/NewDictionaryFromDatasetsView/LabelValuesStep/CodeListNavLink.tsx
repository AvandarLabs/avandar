import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { NavLink } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { CodeListStatusBadge } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListStatusBadge";
import type { ReactNode } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  labels: DictionaryProposal.Labels;
  isSelected: boolean;
  onSelect: (codeListKey: string) => void;
};

/** How many values a list holds, and that it is ordered when it is. */
function useCodeListDescription(codeList: DictionaryProposal.CodeList): string {
  const { t } = useLingui();
  const values = plural(codeList.values.length, {
    one: "# value",
    other: "# values",
  });
  return codeList.isOrdered ? t`${values} · ordered` : values;
}

/** One code list in the flank: its name, size, and how far along it is. */
export function CodeListNavLink({
  codeList,
  labels,
  isSelected,
  onSelect,
}: Readonly<Props>): ReactNode {
  const description = useCodeListDescription(codeList);
  return (
    <NavLink
      component="button"
      type="button"
      active={isSelected}
      aria-current={isSelected ? "true" : undefined}
      label={codeList.name}
      description={description}
      rightSection={
        <CodeListStatusBadge
          status={DictionaryProposal.getCodeListStatus(labels, codeList)}
        />
      }
      onClick={() => {
        onSelect(codeList.key);
      }}
    />
  );
}

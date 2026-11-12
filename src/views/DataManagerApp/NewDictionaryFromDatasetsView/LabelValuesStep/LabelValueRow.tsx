import { useLingui } from "@lingui/react/macro";
import { Checkbox, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  item: ColumnProfile.Value;
  codeListKey: string;
  label: DictionaryProposal.ValueLabel | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * One value to label: the code as found in the data, how many rows hold
 * it, its label (marked when it is an unchecked suggestion), and whether
 * it stands for a missing answer.
 */
export function LabelValueRow({
  item,
  codeListKey,
  label,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const code = item.value;
  const marker =
    label?.source === "suggested" ? (
      <Tooltip label={t`Suggested from the column name and values`}>
        <span tabIndex={0} aria-label={t`Suggested`}>
          <IconSparkles size={14} aria-hidden />
        </span>
      </Tooltip>
    ) : null;

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={600}>
          {code}
        </Text>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm">{i18n.number(item.rowCount)}</Text>
      </Table.Td>
      <Table.Td>
        <TextInput
          size="xs"
          aria-label={t`Label for ${code}`}
          placeholder={t`Label for ${code}`}
          value={label?.label ?? ""}
          rightSection={marker}
          rightSectionPointerEvents="all"
          onChange={(event) => {
            const value = event.currentTarget.value;
            dispatch({
              type: "set_value_label",
              codeListKey,
              code,
              label: value,
            });
          }}
        />
      </Table.Td>
      <Table.Td>
        <Checkbox
          label={t`Missing`}
          aria-label={t`${code} stands for a missing answer`}
          checked={label?.isMissing ?? false}
          onChange={(event) => {
            const isMissing = event.currentTarget.checked;
            dispatch({
              type: "set_value_missing",
              codeListKey,
              code,
              isMissing,
            });
          }}
        />
      </Table.Td>
    </Table.Tr>
  );
}

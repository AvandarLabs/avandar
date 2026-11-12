import { useLingui } from "@lingui/react/macro";
import { Checkbox, Table, Text, TextInput } from "@mantine/core";
import { SuggestedLabelMarker } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/SuggestedLabelMarker";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ChangeEvent, Dispatch, ReactNode } from "react";

type Props = {
  item: ColumnProfile.Value;
  codeListKey: string;
  label: DictionaryProposal.ValueLabel | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * One value to label: the code as found in the data, how many rows hold
 * it, its label (described as a suggestion until the user changes it), and
 * whether it stands for a missing answer.
 */
export function LabelValueRow({
  item,
  codeListKey,
  label,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const code = item.value;
  const isSuggested = label?.source === "suggested";
  const onLabelChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.currentTarget.value;
    dispatch({ type: "set_value_label", codeListKey, code, label: value });
  };
  const onMissingChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const isMissing = event.currentTarget.checked;
    dispatch({ type: "set_value_missing", codeListKey, code, isMissing });
  };

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
          description={
            isSuggested
              ? t`Suggested from the column name and values`
              : undefined
          }
          value={label?.label ?? ""}
          rightSection={isSuggested ? <SuggestedLabelMarker /> : null}
          onChange={onLabelChange}
        />
      </Table.Td>
      <Table.Td>
        <Checkbox
          label={t`Missing`}
          aria-label={t`${code} stands for a missing answer`}
          checked={label?.isMissing ?? false}
          onChange={onMissingChange}
        />
      </Table.Td>
    </Table.Tr>
  );
}

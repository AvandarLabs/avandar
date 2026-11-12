import { useLingui } from "@lingui/react/macro";
import { Checkbox, Table, Text } from "@mantine/core";
import { ValueLabelInput } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/ValueLabelInput";
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
        <ValueLabelInput
          code={code}
          codeListKey={codeListKey}
          label={label}
          dispatch={dispatch}
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

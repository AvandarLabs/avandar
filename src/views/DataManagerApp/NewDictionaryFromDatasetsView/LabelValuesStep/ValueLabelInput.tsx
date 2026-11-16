import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { SuggestedLabelMarker } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/SuggestedLabelMarker";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ChangeEvent, Dispatch, ReactNode } from "react";

type Props = {
  code: string;
  codeListKey: string;
  label: DictionaryProposal.ValueLabel | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The field for one value's label. A label that is still an unchecked
 * suggestion says so in the field's description, which screen readers read
 * with the field, and a decorative sparkle marks it for sighted users.
 */
export function ValueLabelInput({
  code,
  codeListKey,
  label,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const isSuggested = label?.source === "suggested";
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.currentTarget.value;
    dispatch({ type: "set_value_label", codeListKey, code, label: value });
  };

  return (
    <TextInput
      size="xs"
      aria-label={t`Label for ${code}`}
      placeholder={t`Label for ${code}`}
      description={
        isSuggested ? t`Suggested from the column name and values` : undefined
      }
      value={label?.label ?? ""}
      rightSection={isSuggested ? <SuggestedLabelMarker /> : null}
      onChange={onChange}
    />
  );
}

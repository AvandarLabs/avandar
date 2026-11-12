import { EditableDisplayText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { notifyError } from "@/utils/notifications/notify";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
};

/**
 * The dictionary's name as inline-editable text. A rename saves on its own,
 * outside the contents draft, because it is a field of the dictionary row
 * and not of its entries or code lists.
 */
export function DataDictionaryNameField({
  dictionary,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [name, setName] = useState(dictionary.name);
  useEffect(() => {
    setName(dictionary.name);
  }, [dictionary.name]);
  const [updateDictionary, isUpdating] = DataDictionaryClient.useUpdate({
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onError: (error) => {
      notifyError(t`The name could not be saved: ${error.message}`);
    },
  });

  return (
    <EditableDisplayText
      name={t`dictionary name`}
      value={name}
      onChange={setName}
      onSave={(newName) => {
        updateDictionary({
          id: dictionary.id,
          data: { name: newName.trim() },
        });
      }}
      onCancel={() => {
        setName(dictionary.name);
      }}
      isSaving={isUpdating}
      isSaveDisabled={name.trim().length === 0}
      minRows={1}
      maxRows={2}
      emptyDisplayText={t`Untitled dictionary`}
      displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
      fz="inherit"
      fw="inherit"
    />
  );
}

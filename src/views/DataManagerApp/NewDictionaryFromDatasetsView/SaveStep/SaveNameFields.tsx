import { useLingui } from "@lingui/react/macro";
import { Stack, Text, Textarea, TextInput } from "@mantine/core";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  name: string;
  description: string;
  originDatasetName: string | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The new dictionary's name and description. From a dataset's menu it adds
 * that the dictionary is not tied to that dataset.
 */
export function SaveNameFields({
  name,
  description,
  originDatasetName,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <TextInput
        label={t`Dictionary name`}
        value={name}
        onChange={(event) => {
          dispatch({ type: "set_name", name: event.currentTarget.value });
        }}
      />
      <Textarea
        label={t`Description`}
        autosize
        minRows={2}
        value={description}
        onChange={(event) => {
          const nextDescription = event.currentTarget.value;
          dispatch({ type: "set_description", description: nextDescription });
        }}
      />
      {originDatasetName ? (
        <Text size="sm" c="dimmed">
          {t`Saved to Dictionaries like any other dictionary. ${originDatasetName} is only where it started, so you can use it with any dataset.`}
        </Text>
      ) : null}
    </Stack>
  );
}

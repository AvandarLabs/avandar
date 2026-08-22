import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

import { useLingui } from "@lingui/react/macro";
import { Select, Stack, TextInput } from "@mantine/core";

type Props = {
  editor: CaseTypeDraftEditor;
  /** Every included column, across all source datasets, as label candidates. */
  labelOptions: ReadonlyArray<{ value: string; label: string }>;
};

/** Name, description, and the column that labels each case. */
export function CaseTypeDraftIdentityFields({
  editor,
  labelOptions,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const { draft } = editor;
  return (
    <Stack gap="xs">
      <TextInput
        size="xs"
        label={t`Name`}
        value={draft.name}
        error={draft.name.trim().length === 0 ? t`Required` : undefined}
        onChange={(event) => {
          editor.setName(event.currentTarget.value);
        }}
      />
      <TextInput
        size="xs"
        label={t`Description`}
        value={draft.description ?? ""}
        onChange={(event) => {
          editor.setDescription(event.currentTarget.value);
        }}
      />
      <Select
        size="xs"
        label={t`Label`}
        description={t`The column that names each case in the UI`}
        data={labelOptions}
        value={draft.labelColumnId ?? null}
        allowDeselect={false}
        searchable
        onChange={(value) => {
          if (value) {
            editor.setLabelColumnId(value);
          }
        }}
      />
    </Stack>
  );
}

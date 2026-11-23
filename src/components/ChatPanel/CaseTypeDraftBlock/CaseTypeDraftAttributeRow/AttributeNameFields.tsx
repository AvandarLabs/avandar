import { useLingui } from "@lingui/react/macro";
import { Group, Text, TextInput } from "@mantine/core";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import css from "@/components/ChatPanel/CaseTypeDraftBlock/CaseTypeDraftCard.module.css";
import type { ChatProposedCaseAttribute } from "$/types/chat.types";
import type { CaseTypeDraftEditor } from "@/components/ChatPanel/CaseTypeDraftBlock/useCaseTypeDraftEditor";

type Props = {
  attribute: ChatProposedCaseAttribute;
  columnLabel: string;
  isPrimaryKey: boolean;
  isLabelColumn: boolean;
  editor: CaseTypeDraftEditor;
};

/** The name input and the column hints under it. */
export function AttributeNameFields({
  attribute,
  columnLabel,
  isPrimaryKey,
  isLabelColumn,
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  return (
    <>
      <TextInput
        size="xs"
        value={attribute.name}
        aria-label={t`Name for ${columnLabel}`}
        error={
          attribute.isIncluded &&
          ConceptStatus.isReservedAttributeName(attribute.name)
            ? t`Every case type already has a status. Choose another name.`
            : undefined
        }
        onChange={(event) => {
          editor.setAttributeName(
            attribute.columnId,
            event.currentTarget.value,
          );
        }}
      />
      <Group gap={4} mt={2}>
        <Text size="xs" c="dimmed" className={css.columnHint}>
          {columnLabel}
        </Text>
        {isPrimaryKey ? (
          <Text size="xs" c="blue.7">
            {t`join key`}
          </Text>
        ) : null}
        {isLabelColumn ? (
          <Text size="xs" c="blue.7">
            {t`label`}
          </Text>
        ) : null}
      </Group>
    </>
  );
}

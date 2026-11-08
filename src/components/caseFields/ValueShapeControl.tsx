import { objectKeys } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useId } from "react";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, which names the control for assistive technology. */
  fieldName: string;
  value: ConceptAttribute.ValueShape;
  onChange: (valueShape: ConceptAttribute.ValueShape) => void;
  /** Locks the choice, for example on a join key, which keeps one value. */
  disabled?: boolean;
  /** Says why the choice is locked. Shown under the control, read with it. */
  description?: string;
};

/**
 * Chooses whether a case type field keeps one value per record or every
 * value. Use it wherever a field is designed, for example the chat draft
 * card or the case type form.
 */
export function ValueShapeControl({
  fieldName,
  value,
  onChange,
  disabled = false,
  description,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const descriptionId = useId();
  const labelsByValueShape: Record<ConceptAttribute.ValueShape, string> = {
    single: t`One value`,
    list: t`Every value`,
  };
  return (
    <Stack gap={4} align="flex-start">
      <SegmentedControl
        size="xs"
        aria-label={t`One value or every value for ${fieldName}`}
        aria-describedby={description ? descriptionId : undefined}
        data={objectKeys(labelsByValueShape).map((valueShape) => {
          return { value: valueShape, label: labelsByValueShape[valueShape] };
        })}
        value={value}
        disabled={disabled}
        onChange={(nextValue) => {
          onChange(nextValue as ConceptAttribute.ValueShape);
        }}
      />
      {description ? (
        <Text id={descriptionId} size="xs" c="dimmed">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}

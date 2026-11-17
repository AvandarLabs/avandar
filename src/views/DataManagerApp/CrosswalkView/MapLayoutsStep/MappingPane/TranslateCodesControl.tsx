import { Trans, useLingui } from "@lingui/react/macro";
import { SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { useId } from "react";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { ReactNode } from "react";

/** The list Select's value for "Don't translate". */
const NO_TRANSLATION = "";

/** What translating a column's codes changes in its fill. */
export type TranslationChange = {
  codeListId: DataDictionaryCodeList.Id | undefined;
  holdsLabels: boolean;
};

type Props = TranslationChange & {
  /** The entry that governs the column, or undefined when it is gone. */
  entry: DictionaryMatch.Entry | undefined;
  onChange: (change: TranslationChange) => void;
};

function HoldsControl(
  props: Readonly<Props & { codeListId: DataDictionaryCodeList.Id }>,
): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  return (
    <Stack gap={6}>
      <Text id={labelId} size="xs" fw={600} c="dimmed">
        <Trans>The column holds</Trans>
      </Text>
      <SegmentedControl
        fullWidth
        size="xs"
        aria-labelledby={labelId}
        value={props.holdsLabels ? "labels" : "codes"}
        data={[
          { value: "codes", label: t`Source values` },
          { value: "labels", label: t`Target values` },
        ]}
        onChange={(value) => {
          props.onChange({
            codeListId: props.codeListId,
            holdsLabels: value === "labels",
          });
        }}
      />
    </Stack>
  );
}

/**
 * For a governed column: which of the entry's code lists this dataset's
 * values are written in, and whether they are its codes or its labels. The
 * combined dataset reconciles them to the entry's primary list. A list
 * that was deleted is called out until another is chosen.
 */
export function TranslateCodesControl(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const codeLists = props.entry?.codeLists ?? [];
  const { codeListId } = props;
  const isMissing =
    codeListId !== undefined &&
    !codeLists.some((codeList) => {
      return codeList.id === codeListId;
    });
  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label={t`Translate values with`}
        allowDeselect={false}
        value={isMissing ? null : (codeListId ?? NO_TRANSLATION)}
        error={
          isMissing
            ? t`The code list this used was deleted. Choose another.`
            : undefined
        }
        data={[
          { value: NO_TRANSLATION, label: t`Don't translate` },
          ...codeLists.map((codeList) => {
            return { value: codeList.id, label: codeList.name };
          }),
        ]}
        onChange={(value) => {
          const chosen = codeLists.find((codeList) => {
            return codeList.id === value;
          });
          props.onChange({
            codeListId: chosen?.id,
            holdsLabels: chosen ? props.holdsLabels : false,
          });
        }}
      />
      {codeListId && !isMissing ? (
        <HoldsControl {...props} codeListId={codeListId} />
      ) : null}
    </Stack>
  );
}

import { useLingui } from "@lingui/react/macro";
import {
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useId, useState } from "react";
import { toDateFormatLabel } from "@/lib/crosswalks/toDateFormatLabel/toDateFormatLabel";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import {
  getConvertKinds,
  getMultiplyPreset,
  makeConvertForKind,
  MULTIPLY_PRESETS,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/convertDefaults/convertDefaults";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  ConvertKind,
  MultiplyPresetKey,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/convertDefaults/convertDefaults";
import type { ReactNode } from "react";

type Convert = CrosswalkMapping.Convert;
type OnConvert = (convert: Convert | undefined) => void;

/** The format and factor Selects' value for typing one's own. */
const OWN_VALUE = "own";

/** The formats the date Select offers, the ones values are checked with. */
const DATE_FORMATS: readonly string[] = ColumnProfileSql.DATE_FORMATS;

const LETTER_CASES = ["keep", "lower", "upper"] as const;

function DateFormatControl(
  props: Readonly<{ format: string; onChange: OnConvert }>,
): ReactNode {
  const { t } = useLingui();
  const [isOwnFormat, setIsOwnFormat] = useState(
    !DATE_FORMATS.includes(props.format),
  );
  const exampleFormat = "%d.%m.%Y";
  return (
    <>
      <Select
        size="xs"
        label={t`Date format`}
        allowDeselect={false}
        value={isOwnFormat ? OWN_VALUE : props.format}
        data={[
          ...DATE_FORMATS.map((format) => {
            return { value: format, label: toDateFormatLabel(format) };
          }),
          { value: OWN_VALUE, label: t`Another format` },
        ]}
        onChange={(value) => {
          setIsOwnFormat(value === OWN_VALUE);
          if (value && value !== OWN_VALUE) {
            props.onChange({ kind: "parse_date", format: value });
          }
        }}
      />
      {isOwnFormat ? (
        <TextInput
          size="xs"
          label={t`Format`}
          description={t`Use %Y for the year, %m for the month, and %d for the day, such as ${exampleFormat}.`}
          defaultValue={props.format}
          onChange={(event) => {
            const format = event.currentTarget.value;
            if (format.trim() !== "") {
              props.onChange({ kind: "parse_date", format });
            }
          }}
        />
      ) : null}
    </>
  );
}

function MultiplyPresetSelect(
  props: Readonly<{
    factor: number;
    isOwnFactor: boolean;
    onChooseOwn: (isOwnFactor: boolean) => void;
    onChange: OnConvert;
  }>,
): ReactNode {
  const { t } = useLingui();
  const preset = getMultiplyPreset(props.factor);
  const labels: Record<MultiplyPresetKey, string> = {
    months_to_years: t`Months to years`,
    years_to_months: t`Years to months`,
    days_to_years: t`Days to years`,
  };
  return (
    <Select
      size="xs"
      label={t`Factor`}
      allowDeselect={false}
      value={props.isOwnFactor ? OWN_VALUE : (preset ?? OWN_VALUE)}
      data={[
        ...MULTIPLY_PRESETS.map((item) => {
          return { value: item.key, label: labels[item.key] };
        }),
        { value: OWN_VALUE, label: t`Another number` },
      ]}
      onChange={(value) => {
        const chosen = MULTIPLY_PRESETS.find((item) => {
          return item.key === value;
        });
        props.onChooseOwn(chosen === undefined);
        if (chosen) {
          props.onChange({ kind: "multiply", factor: chosen.factor });
        }
      }}
    />
  );
}

function MultiplyControl(
  props: Readonly<{ factor: number; onChange: OnConvert }>,
): ReactNode {
  const { t } = useLingui();
  const [isOwnFactor, setIsOwnFactor] = useState(
    getMultiplyPreset(props.factor) === undefined,
  );
  return (
    <>
      <MultiplyPresetSelect
        factor={props.factor}
        isOwnFactor={isOwnFactor}
        onChooseOwn={setIsOwnFactor}
        onChange={props.onChange}
      />
      {isOwnFactor ? (
        <NumberInput
          size="xs"
          label={t`Multiply by`}
          decimalScale={10}
          defaultValue={props.factor}
          onChange={(value) => {
            if (
              typeof value === "number" &&
              Number.isFinite(value) &&
              value !== 0
            ) {
              props.onChange({ kind: "multiply", factor: value });
            }
          }}
        />
      ) : null}
    </>
  );
}

function LetterCaseControl(
  props: Readonly<{
    letterCase: (typeof LETTER_CASES)[number];
    onChange: OnConvert;
  }>,
): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  const labels = {
    keep: t`Keep case`,
    lower: t`lowercase`,
    upper: t`UPPERCASE`,
  };
  return (
    <Stack gap={6}>
      <Text id={labelId} size="xs" fw={600} c="dimmed">
        {t`Letter case`}
      </Text>
      <SegmentedControl
        fullWidth
        size="xs"
        aria-labelledby={labelId}
        value={props.letterCase}
        data={LETTER_CASES.map((value) => {
          return { value, label: labels[value] };
        })}
        onChange={(value) => {
          const letterCase = LETTER_CASES.find((candidate) => {
            return candidate === value;
          });
          if (letterCase) {
            props.onChange({ kind: "trim_and_fix_case", letterCase });
          }
        }}
      />
    </Stack>
  );
}

function PadLengthInput(
  props: Readonly<{ length: number; onChange: OnConvert }>,
): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      size="xs"
      label={t`Length`}
      description={t`Values made only of digits get leading zeros up to this length. Longer values stay as they are.`}
      min={1}
      max={64}
      allowDecimal={false}
      allowNegative={false}
      value={props.length}
      onChange={(value) => {
        if (
          typeof value === "number" &&
          Number.isInteger(value) &&
          value >= 1
        ) {
          props.onChange({ kind: "pad_text", length: value });
        }
      }}
    />
  );
}

/** The chosen conversion's own settings. */
function ConvertDetails(
  props: Readonly<{ convert: Convert | undefined; onChange: OnConvert }>,
): ReactNode {
  const { convert, onChange } = props;
  switch (convert?.kind) {
    case "parse_date":
      return <DateFormatControl format={convert.format} onChange={onChange} />;
    case "pad_text":
      return <PadLengthInput length={convert.length} onChange={onChange} />;
    case "multiply":
      return <MultiplyControl factor={convert.factor} onChange={onChange} />;
    case "trim_and_fix_case":
      return (
        <LetterCaseControl
          letterCase={convert.letterCase}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function useConvertKindLabels(): Record<ConvertKind, string> {
  const { t } = useLingui();
  return {
    none: t`No change`,
    parse_date: t`Read as a date`,
    pad_text: t`Pad with zeros`,
    multiply: t`Multiply`,
    trim_and_fix_case: t`Trim spaces`,
  };
}

type Props = {
  convert: Convert | undefined;
  /** The source column's type, which decides whether padding is offered. */
  sourceDataType: AvaDataType.T | undefined;
  detectedDateFormat: string | undefined;
  onChange: OnConvert;
};

/**
 * Change the values: no change, read as a date, pad with zeros, multiply,
 * or trim spaces, each with its own settings below the Select.
 */
export function ConvertControl(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labels = useConvertKindLabels();
  const { convert } = props;
  const offered = getConvertKinds(props.sourceDataType);
  const kinds =
    convert && !offered.includes(convert.kind)
      ? [...offered, convert.kind]
      : offered;
  return (
    <Stack gap="xs">
      <Select
        size="xs"
        label={t`Change the values`}
        allowDeselect={false}
        value={convert?.kind ?? "none"}
        data={kinds.map((kind) => {
          return { value: kind, label: labels[kind] };
        })}
        onChange={(value) => {
          const kind = kinds.find((candidate) => {
            return candidate === value;
          });
          if (kind) {
            props.onChange(
              makeConvertForKind({
                kind,
                current: convert,
                detectedDateFormat: props.detectedDateFormat,
              }),
            );
          }
        }}
      />
      <ConvertDetails convert={convert} onChange={props.onChange} />
    </Stack>
  );
}

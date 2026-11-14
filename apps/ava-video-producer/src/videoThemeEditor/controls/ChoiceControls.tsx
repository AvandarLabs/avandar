import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Switch } from "@mantine/core";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_REGISTRY,
} from "../../videoTheme/videoFontRegistry/videoFontRegistry";
import {
  useRowHasIssue,
  useRowIssueAriaProps,
} from "../RowIssueContext/RowIssueContext";
import { useOptionCopy, type OptionCopy } from "../tokenCopy/useEditorCopy";
import css from "./controls.module.css";
import { getEnumSelection } from "./controlValues/controlValues";
import type { ValueControlProps } from "./valueControl.types";

/** A font token: one of the registered families, marked when its glyph widths are measured. */
export function FontValueControl({
  label,
  definition,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
  const hasIssue = useRowHasIssue();
  const data = VIDEO_FONT_IDS.map((id) => {
    const font = VIDEO_FONT_REGISTRY[id];
    const name = font.label;
    return {
      value: definition.kind === "fontStack" ? font.stack : id,
      label: font.measured ? t`${name}, measured widths` : name,
    };
  });
  return (
    <AtlasSelect
      aria-label={label}
      error={hasIssue}
      data={data}
      value={String(value)}
      onChange={(next) => next && onChange(next)}
    />
  );
}

type EnumOption = OptionCopy & Readonly<{ option: string }>;

/** An enum menu whose options show their explanations under their names. */
function EnumMenu({
  label,
  value,
  options,
  hasIssue,
  onChange,
}: Readonly<{
  label: string;
  value: string | undefined;
  options: readonly EnumOption[];
  hasIssue: boolean;
  onChange: (option: string) => void;
}>) {
  const { t } = useLingui();
  const descriptions = new Map(
    options.map((entry) => [entry.option, entry.description]),
  );
  return (
    <AtlasSelect
      aria-label={label}
      error={hasIssue}
      value={value ?? null}
      placeholder={t`Not set`}
      data={options.map((entry) => ({
        value: entry.option,
        label: entry.label,
      }))}
      onChange={(next) => next && onChange(next)}
      renderOption={({ option }) => {
        const description = descriptions.get(option.value);
        return (
          <span className={css.option}>
            <span>{option.label}</span>
            {description ? (
              <span className={css.optionDescription}>{description}</span>
            ) : null}
          </span>
        );
      }}
    />
  );
}

/** An enum token: segments for up to three options, otherwise a menu with explanations. */
export function EnumValueControl({
  label,
  definition,
  value,
  onChange,
  optionKey = "",
}: ValueControlProps) {
  const copy = useOptionCopy();
  const hasIssue = useRowHasIssue();
  const options = (definition.options ?? []).map((option) => ({
    option,
    ...copy(optionKey, option),
  }));
  const selection = getEnumSelection(
    value,
    options.map((entry) => entry.option),
  );
  if (options.length > 3) {
    return (
      <EnumMenu
        label={label}
        value={selection}
        options={options}
        hasIssue={hasIssue}
        onChange={onChange}
      />
    );
  }
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label={label}
      aria-invalid={hasIssue || undefined}
      value={selection ?? ""}
      data={options.map((entry) => ({
        value: entry.option,
        label: entry.label,
      }))}
      onChange={onChange}
    />
  );
}

/** A switch token. */
export function BooleanValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  const hasIssue = useRowHasIssue();
  const issueAriaProps = useRowIssueAriaProps();
  return (
    <Switch
      size="xs"
      aria-label={label}
      error={hasIssue}
      {...issueAriaProps}
      checked={value === true}
      onChange={(event) => onChange(event.currentTarget.checked)}
    />
  );
}

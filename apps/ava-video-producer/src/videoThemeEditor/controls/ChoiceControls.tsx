import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Switch } from "@mantine/core";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_REGISTRY,
} from "../../videoTheme/videoFontRegistry/videoFontRegistry";
import { useOptionCopy } from "../tokenCopy/useEditorCopy";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";

/** A font token: one of the registered families, marked when its glyph widths are measured. */
export function FontValueControl({
  label,
  definition,
  value,
  onChange,
}: ValueControlProps) {
  const { t } = useLingui();
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
      data={data}
      value={String(value)}
      onChange={(next) => next && onChange(next)}
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
  const options = (definition.options ?? []).map((option) => ({
    option,
    ...copy(optionKey, option),
  }));
  const data = options.map((entry) => ({
    value: entry.option,
    label: entry.label,
  }));
  if (options.length <= 3) {
    return (
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label={label}
        value={String(value)}
        data={data}
        onChange={onChange}
      />
    );
  }
  return (
    <AtlasSelect
      aria-label={label}
      value={String(value)}
      data={data}
      onChange={(next) => next && onChange(next)}
      renderOption={({ option }) => {
        const description = options.find(
          (entry) => entry.option === option.value,
        )?.description;
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

/** A switch token. */
export function BooleanValueControl({
  label,
  value,
  onChange,
}: ValueControlProps) {
  return (
    <Switch
      size="xs"
      aria-label={label}
      checked={value === true}
      onChange={(event) => onChange(event.currentTarget.checked)}
    />
  );
}

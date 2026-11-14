import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import { isTokenReference } from "../../videoTheme/themeReferences/themeReferences";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import { getCustomScaleFromReference } from "../customTokenValue/customTokenValue";
import { formatTokenValue } from "../formatTokenValue/formatTokenValue";
import {
  isCameraCurveToken,
  listReferenceOptions,
  orderReferenceOptions,
  type ReferenceOption,
} from "../referenceOptions/referenceOptions";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import { getDefaultLiteralFromKind } from "./defaultLiterals";
import { ValueControl } from "./ValueControl";
import type {
  TokenDefinition,
  TokenKind,
} from "../../videoTheme/videoTheme.types";
import type { ValueControlProps } from "./valueControl.types";

/** Where a reference control writes and what it may offer. */
export type ReferenceControlProps = Readonly<{
  label: string;
  tokenPath: string;
  /** Empty for the token itself, or the composite field, such as `["size"]`. */
  fieldPath: readonly string[];
  kind: TokenKind;
  /** The field's authored value: a reference, a literal, or undefined when unset. */
  value: unknown;
  /** The token's whole authored value, for writing one field of a composite. */
  tokenValue: unknown;
  /** Component tokens may hold a literal one-off. */
  allowLiteral: boolean;
  /** Bounds for a literal when the field is the token itself. */
  definition?: TokenDefinition;
  onChange: (value: unknown) => void;
}>;

type CustomValueProps = ReferenceControlProps &
  Readonly<{ options: readonly ReferenceOption[] }>;

function useOptionLabel(): (option: ReferenceOption) => string {
  const { t } = useLingui();
  const copy = useTokenCopy();
  return useCallback(
    (option: ReferenceOption) => {
      const value = formatTokenValue(option.kind, option.value);
      if (option.path === "primary") {
        return t`Primary color, ${value}`;
      }
      const name = option.definition
        ? copy(option.definition.label)
        : option.path;
      const key = option.key;
      return key === undefined
        ? t`${name} · ${value}`
        : t`${name} ${key} · ${value}`;
    },
    [t, copy],
  );
}

/** The bounds a custom value is edited with: the token's own, or its scale's. */
function _customDefinition(
  props: CustomValueProps,
  scale: string | undefined,
): ValueControlProps["definition"] {
  if (props.allowLiteral) {
    return props.definition ?? { kind: props.kind };
  }
  return getTokenDefinitionFromPath(`${scale}.custom`) ?? { kind: props.kind };
}

/**
 * Where a custom value goes: the token itself for a component one-off, or a
 * new named scale entry for a semantic token.
 */
function useCustomValueWriter(
  props: ReferenceControlProps,
): (literal: unknown) => void {
  const editor = useTokenEditor();
  return (literal: unknown) =>
    props.allowLiteral
      ? props.onChange(literal)
      : editor.setCustomValue({
          tokenPath: props.tokenPath,
          fieldPath: props.fieldPath,
          currentValue: props.tokenValue,
          currentReference: props.value,
          kind: props.kind,
          literal,
        });
}

function CustomValue(props: CustomValueProps) {
  const { t } = useLingui();
  const write = useCustomValueWriter(props);
  const isReference = isTokenReference(props.value);
  const scale = props.allowLiteral
    ? undefined
    : getCustomScaleFromReference(props.value, props.kind);
  const [isOpen, setOpen] = useState(
    props.allowLiteral && props.value !== undefined && !isReference,
  );
  if (!props.allowLiteral && !scale) {
    return null;
  }
  const definition = _customDefinition(props, scale);
  const current = isReference
    ? props.options.find((option) => option.reference === props.value)?.value
    : props.value;
  const name = props.label;
  return (
    <div className={css.custom}>
      <Button
        className={css.customToggle}
        size="compact-xs"
        variant="subtle"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        {t`Custom value`}
      </Button>
      {isOpen ? (
        <ValueControl
          label={t`Custom ${name}`}
          definition={definition}
          value={current ?? getDefaultLiteralFromKind(definition.kind)}
          optionKey={props.fieldPath.at(-1) ?? props.tokenPath}
          isCameraCurve={isCameraCurveToken(props.tokenPath, props.fieldPath)}
          onChange={write}
        />
      ) : null}
    </div>
  );
}

function useReferenceOptions(
  props: ReferenceControlProps,
): readonly ReferenceOption[] {
  const { rows, theme } = useTokenEditor();
  const { kind, tokenPath, fieldPath, value } = props;
  const isCameraCurve = isCameraCurveToken(tokenPath, fieldPath);
  return useMemo(
    () =>
      orderReferenceOptions(
        listReferenceOptions({
          kind,
          excludePath: tokenPath,
          rows,
          theme,
          isCameraCurve,
        }),
        value,
      ),
    [kind, tokenPath, value, rows, theme, isCameraCurve],
  );
}

/** Each option's colour chip, keyed by its reference. Only colours have one. */
function useOptionChips(
  options: readonly ReferenceOption[],
): ReadonlyMap<string, string | undefined> {
  return useMemo(
    () =>
      new Map<string, string | undefined>(
        options.map((option) => [
          option.reference,
          option.kind === "color" && typeof option.value === "string"
            ? option.value
            : undefined,
        ]),
      ),
    [options],
  );
}

/** One picker option: a colour chip when it has one, then its label. */
function _OptionRow({
  label,
  chip,
}: Readonly<{ label: string; chip: string | undefined }>) {
  return (
    <span className={css.option}>
      {chip ? (
        <span
          className={css.chip}
          style={{ background: chip }}
          aria-hidden="true"
        />
      ) : null}
      <span>{label}</span>
    </span>
  );
}

/**
 * Points a semantic or component token, or one field of it, at another
 * token, with each option's current value as text and a chip for colours.
 * Component tokens, and semantic tokens whose kind has a scale, can also take
 * a custom value. On a semantic token it becomes a named scale entry. A
 * camera curve offers only camera-safe curves, as options and as a custom
 * value.
 */
export function ReferenceControl(props: ReferenceControlProps) {
  const { t } = useLingui();
  const toLabel = useOptionLabel();
  const options = useReferenceOptions(props);
  const chips = useOptionChips(options);
  return (
    <div className={css.reference}>
      <AtlasSelect
        aria-label={props.label}
        searchable
        data={options.map((option) => ({
          value: option.reference,
          label: toLabel(option),
        }))}
        value={isTokenReference(props.value) ? props.value : null}
        placeholder={props.value === undefined ? t`Not set` : t`Custom value`}
        nothingFoundMessage={t`No matching tokens`}
        onChange={(next) => next && props.onChange(next)}
        renderOption={({ option }) => (
          <_OptionRow label={option.label} chip={chips.get(option.value)} />
        )}
      />
      <CustomValue {...props} options={options} />
    </div>
  );
}

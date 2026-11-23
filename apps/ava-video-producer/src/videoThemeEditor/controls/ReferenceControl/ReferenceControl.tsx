import { makeMap, matchLiteral } from "@avandar/utils";
import {
  useCallback,
  useMemo,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import { ThemeReferences } from "../../../videoTheme/ThemeReferences/ThemeReferences";
import { CustomScaleKeys } from "../../CustomScaleKeys/CustomScaleKeys";
import { formatTokenValue } from "../../formatTokenValue/formatTokenValue";
import {
  type ReferenceOption,
  ReferenceOptions,
} from "../../ReferenceOptions/ReferenceOptions";
import { useRowHasIssue } from "../../RowIssueContext/RowIssueContext";
import { useTokenEditor } from "../../TokenEditorContext";
import { CustomValue } from "./CustomValue/CustomValue";
import { OptionRow } from "./OptionRow/OptionRow";
import { PickAnotherButton } from "./PickAnotherButton/PickAnotherButton";
import css from "./ReferenceControl.module.css";
import type {
  TokenDefinition,
  TokenKind,
} from "../../../videoTheme/videoTheme.types";
/** Where a reference control writes and what it may offer. */
export type Props = Readonly<{
  label: string;
  tokenPath: string;
  /** Empty for the token itself, or the composite field, such as `["size"]`. */
  fieldPath: readonly string[];
  kind: TokenKind;
  /**
   * The field's authored value: a reference, a literal, or undefined when
   * unset.
   */
  value: unknown;
  /** The token's whole authored value, for writing one field of a composite. */
  tokenValue: unknown;
  /** Component tokens may hold a literal one-off. */
  allowLiteral: boolean;
  /** Bounds for a literal when the field is the token itself. */
  definition?: TokenDefinition;
  onChange: (value: unknown) => void;
}>;
function useReferenceControlState({
  kind,
  tokenPath,
  fieldPath,
  value,
}: Readonly<
  Pick<Props, "kind" | "tokenPath" | "fieldPath" | "value">
>): Readonly<{
  toLabel: ReturnType<typeof useOptionLabel>;
  options: ReturnType<typeof useReferenceOptions>;
  hasIssue: boolean;
  container: RefObject<HTMLDivElement | null>;
  unresolved:
    | ReturnType<typeof ReferenceOptions.getUnresolvedReference>
    | undefined;
  isColor: boolean;
  chips: ReturnType<typeof _buildChipsFromOptions>;
}> {
  const toLabel = useOptionLabel();
  const options = useReferenceOptions({ kind, tokenPath, fieldPath, value });
  const hasIssue = useRowHasIssue();
  const container = useRef<HTMLDivElement>(null);
  const unresolved = hasIssue
    ? ReferenceOptions.getUnresolvedReference({
        value,
        referenceOptions: options,
      })
    : undefined;
  const isColor = kind === "color" || kind === "fill";
  const chips = _buildChipsFromOptions(options);
  return { toLabel, options, hasIssue, container, unresolved, isColor, chips };
}
function useOptionLabel(): (option: ReferenceOption) => string {
  return useCallback((option: ReferenceOption) => {
    const value = formatTokenValue({ kind: option.kind, value: option.value });
    const role = ReferenceOptions.getReferenceOptionRole(option);
    return matchLiteral(role, {
      primary: () => {
        return `Primary colour, ${value}`;
      },
      custom: () => {
        return option.kind === "color"
          ? `Custom colour · ${value}`
          : `Custom value · ${value}`;
      },
      named: () => {
        const name = option.definition ? option.definition.label : option.path;
        const key =
          option.key === undefined
            ? undefined
            : CustomScaleKeys.humanizeScaleKey(option.key);
        return key === undefined
          ? `${name} · ${value}`
          : `${name} ${key} · ${value}`;
      },
    });
  }, []);
}
function useReferenceOptions({
  kind,
  tokenPath,
  fieldPath,
  value,
}: Pick<
  Props,
  "kind" | "tokenPath" | "fieldPath" | "value"
>): readonly ReferenceOption[] {
  const { rows, theme } = useTokenEditor();
  const isCameraCurve = ReferenceOptions.isCameraCurveToken({
    tokenPath,
    fieldPath,
  });
  return useMemo(() => {
    return ReferenceOptions.orderReferenceOptions({
      referenceOptions: ReferenceOptions.listReferenceOptions({
        kind,
        excludePath: tokenPath,
        rows,
        theme,
        isCameraCurve,
      }),
      current: value,
    });
  }, [kind, tokenPath, value, rows, theme, isCameraCurve]);
}
/** Each option's colour chip, keyed by its reference. Only colours have one. */
function _buildChipsFromOptions(
  options: readonly ReferenceOption[],
): Map<string, string | undefined> {
  return makeMap(options, {
    key: "reference",
    valueFn: (option) => {
      return option.kind === "color" && typeof option.value === "string"
        ? option.value
        : undefined;
    },
  });
}
/**
 * The picker's items, plus a disabled one naming a reference that no longer
 * resolves.
 */
function _buildSelectData(
  input: Readonly<{
    options: readonly ReferenceOption[];
    toLabel: (option: ReferenceOption) => string;
    unresolved: string | undefined;
    isColor: boolean;
  }>,
) {
  const { options, toLabel, unresolved, isColor } = input;
  const data = options.map((option) => {
    return {
      value: option.reference,
      label: toLabel(option),
    };
  });
  return unresolved
    ? [
        ...data,
        {
          value: unresolved,
          label: isColor ? "Missing colour" : "Missing value",
          disabled: true,
        },
      ]
    : data;
}
/**
 * Points a semantic or component token, or one field of it, at another
 * token, with each option's current value as text and a chip for colours.
 * Component tokens, and semantic tokens whose kind has a scale, can also take
 * a custom value. On a semantic token it becomes a named scale entry. A
 * camera curve offers only camera-safe curves, as options and as a custom
 * value.
 */
export function ReferenceControl(props: Props): ReactNode {
  const { label, tokenPath, fieldPath, kind, value, onChange } = props;
  const { toLabel, options, hasIssue, container, unresolved, isColor, chips } =
    useReferenceControlState({ kind, tokenPath, fieldPath, value });
  return (
    <div className={css.referenceControl} ref={container}>
      <AtlasSelect
        aria-label={label}
        error={hasIssue}
        searchable
        data={_buildSelectData({ options, toLabel, unresolved, isColor })}
        value={ThemeReferences.isTokenReference(value) ? value : null}
        placeholder={value === undefined ? "Not set" : "Custom value"}
        nothingFoundMessage="No matching settings"
        onChange={(pickedReference) => {
          return pickedReference && onChange(pickedReference);
        }}
        renderOption={({ option }) => {
          return (
            <OptionRow label={option.label} chip={chips.get(option.value)} />
          );
        }}
      />
      {unresolved ? (
        <PickAnotherButton
          name={label}
          isColor={isColor}
          containerRef={container}
        />
      ) : null}
      <CustomValue {...props} options={options} />
    </div>
  );
}

import { Button } from "@mantine/core";
import { useState } from "react";
import { isTokenReference } from "../../../../videoTheme/themeReferenceHelpers/themeReferenceHelpers";
import { getTokenDefinitionFromPath } from "../../../../videoTheme/tokenCatalog/tokenCatalogHelpers";
import { getCustomScaleFromReference } from "../../../customTokenValue/customTokenValue";
import {
  isCameraCurveToken,
  type ReferenceOption,
} from "../../../referenceOptions/referenceOptions";
import { useTokenEditor } from "../../../TokenEditorContext/TokenEditorContext";
import { getDefaultLiteralFromKind } from "../../getDefaultLiteralFromKind";
import { ValueControl } from "../../ValueControl";
import css from "./CustomValue.module.css";
import type { ValueControlProps } from "../../valueControl.types";
import type { Props as ReferenceControlProps } from "../ReferenceControl";

type Props = ReferenceControlProps &
  Readonly<{ options: readonly ReferenceOption[] }>;

/** The bounds a custom value is edited with: the token's own, or its scale's. */
function _customDefinition(
  options: Readonly<{
    allowLiteral: boolean;
    definition: ReferenceControlProps["definition"];
    kind: ReferenceControlProps["kind"];
    scale: string | undefined;
  }>,
): ValueControlProps["definition"] {
  const { allowLiteral, definition, kind, scale } = options;
  return allowLiteral
    ? (definition ?? { kind })
    : (getTokenDefinitionFromPath(`${scale}.custom`) ?? { kind });
}

/**
 * Where a custom value goes: the token itself for a component one-off, or a
 * new named scale entry for a semantic token.
 */
function useCustomValueWriter(
  reference: Pick<
    ReferenceControlProps,
    | "tokenPath"
    | "fieldPath"
    | "kind"
    | "value"
    | "tokenValue"
    | "allowLiteral"
    | "onChange"
  >,
): (literal: unknown) => void {
  const editor = useTokenEditor();
  return (literal: unknown) =>
    reference.allowLiteral
      ? reference.onChange(literal)
      : editor.setCustomValue({
          tokenPath: reference.tokenPath,
          fieldPath: reference.fieldPath,
          currentValue: reference.tokenValue,
          currentReference: reference.value,
          kind: reference.kind,
          literal,
        });
}

/** The toggle and editor for a custom value in place of a reference. */
export function CustomValue({
  label,
  tokenPath,
  fieldPath,
  kind,
  value,
  tokenValue,
  allowLiteral,
  definition: tokenDefinition,
  onChange,
  options,
}: Props) {
  const write = useCustomValueWriter({
    tokenPath,
    fieldPath,
    kind,
    value,
    tokenValue,
    allowLiteral,
    onChange,
  });
  const isReference = isTokenReference(value);
  const scale = allowLiteral
    ? undefined
    : getCustomScaleFromReference(value, kind);
  const [isOpen, setOpen] = useState(
    allowLiteral && value !== undefined && !isReference,
  );
  if (!allowLiteral && !scale) {
    return null;
  }
  const definition = _customDefinition({
    allowLiteral,
    definition: tokenDefinition,
    kind,
    scale,
  });
  const current = isReference
    ? options.find((option) => option.reference === value)?.value
    : value;
  return (
    <div className={css.customValue}>
      <Button
        className={css.customValueToggle}
        size="compact-xs"
        variant="subtle"
        aria-label={`Custom value for ${label}`}
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
      >
        {"Custom value"}
      </Button>
      {isOpen ? (
        <ValueControl
          label={`Custom ${label}`}
          definition={definition}
          value={current ?? getDefaultLiteralFromKind(definition.kind)}
          optionKey={fieldPath.at(-1) ?? tokenPath}
          isCameraCurve={isCameraCurveToken(tokenPath, fieldPath)}
          onChange={write}
        />
      ) : null}
    </div>
  );
}

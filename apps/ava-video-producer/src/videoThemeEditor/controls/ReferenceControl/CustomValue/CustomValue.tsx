import { propEq } from "@avandar/utils";
import { Button } from "@mantine/core";
import {
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ThemeReferences } from "../../../../videoTheme/ThemeReferences/ThemeReferences";
import { TokenCatalog } from "../../../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import { CustomTokenValues } from "../../../CustomTokenValues/CustomTokenValues";
import {
  type ReferenceOption,
  ReferenceOptions,
} from "../../../ReferenceOptions/ReferenceOptions";
import { useTokenEditor } from "../../../TokenEditorContext";
import { getDefaultLiteralFromKind } from "../../getDefaultLiteralFromKind";
import { ValueControl } from "../../ValueControl";
import css from "./CustomValue.module.css";
import type { ValueControlProps } from "../../valueControl.types";
import type { Props as ReferenceControlProps } from "../ReferenceControl";

type Props = ReferenceControlProps &
  Readonly<{
    options: readonly ReferenceOption[];
  }>;
/**
 * The bounds a custom value is edited with: the token's own, or its scale's.
 */
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
    : (TokenCatalog.getTokenDefinitionFromPath(`${scale}.custom`) ?? { kind });
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
  return (literal: unknown) => {
    return reference.allowLiteral
      ? reference.onChange(literal)
      : editor.setCustomValue({
          tokenPath: reference.tokenPath,
          fieldPath: reference.fieldPath,
          currentValue: reference.tokenValue,
          currentReference: reference.value,
          kind: reference.kind,
          literal,
        });
  };
}
/** The toggle and editor for a custom value in place of a reference. */
export function CustomValue(props: Props): ReactNode {
  const { label, tokenPath, fieldPath, kind } = props;
  const { write, scale, isReference, isOpen, setOpen } =
    useCustomValueState(props);
  if (!props.allowLiteral && !scale) {
    return null;
  }
  const { definition, current } = _getCustomValueFromProps({
    props,
    scale,
    isReference,
  });
  return (
    <div className={css.customValue}>
      <Button
        className={css.customValueToggle}
        size="compact-xs"
        variant="subtle"
        aria-label={`Custom value for ${label}`}
        aria-expanded={isOpen}
        onClick={() => {
          return setOpen(!isOpen);
        }}
      >
        {"Custom value"}
      </Button>
      {isOpen ? (
        <ValueControl
          label={`Custom ${label}`}
          definition={definition}
          value={current ?? getDefaultLiteralFromKind(definition.kind)}
          optionKey={fieldPath.at(-1) ?? tokenPath}
          isCameraCurve={ReferenceOptions.isCameraCurveToken({
            tokenPath,
            fieldPath,
          })}
          onChange={write}
        />
      ) : null}
    </div>
  );
}

function useCustomValueState(props: Props): {
  write: (literal: unknown) => void;
  scale: string | undefined;
  isReference: boolean;
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
} {
  const { allowLiteral, value, kind } = props;
  const write = useCustomValueWriter(props);
  const isReference = ThemeReferences.isTokenReference(value);
  const scale = allowLiteral
    ? undefined
    : CustomTokenValues.getCustomScaleFromReference({ reference: value, kind });
  const [isOpen, setOpen] = useState(
    allowLiteral && value !== undefined && !isReference,
  );

  return { write, scale, isReference, isOpen, setOpen };
}
function _getCustomValueFromProps({
  props,
  scale,
  isReference,
}: Readonly<{
  props: Props;
  scale: string | undefined;
  isReference: boolean;
}>): { definition: ValueControlProps["definition"]; current: unknown } {
  const { kind } = props;
  const definition = _customDefinition({
    allowLiteral: props.allowLiteral,
    definition: props.definition,
    kind,
    scale,
  });
  const current = isReference
    ? props.options.find(
        propEq<Readonly<{ reference: unknown }>, "reference", unknown>(
          "reference",
          props.value,
        ),
      )?.value
    : props.value;

  return { definition, current };
}

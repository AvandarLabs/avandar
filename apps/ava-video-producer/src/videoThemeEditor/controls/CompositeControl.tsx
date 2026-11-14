import { useLingui } from "@lingui/react/macro";
import { isTokenReference } from "../../videoTheme/themeReferences/themeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  type CompositeTokenKind,
  type FieldSpec,
} from "../../videoTheme/tokenCatalog/defineTokens";
import { useFieldCopy } from "../tokenCopy/useEditorCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { EnumValueControl } from "./ChoiceControls";
import css from "./controls.module.css";
import { ReferenceControl } from "./ReferenceControl";
import { getCompositeFieldsFromValue } from "./roleValues/roleValues";
import { SketchPreview } from "./SketchPreview";
import { TypeSpecimen } from "./TypeSpecimen";
import type {
  ResolvedSketchProfile,
  ResolvedTypeStyle,
} from "../../videoTheme/videoTheme.types";
import type { TokenRow } from "../tokenRows/tokenRows";

type CompositeProps = Readonly<{ row: TokenRow; label: string }>;

type FieldProps = CompositeProps &
  Readonly<{
    name: string;
    field: FieldSpec;
    value: Readonly<Record<string, unknown>>;
  }>;

function CompositeField({ row, label, name, field, value }: FieldProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const fieldName = useFieldCopy()(name);
  const fieldLabel = t`${label}, ${fieldName}`;
  const write = (next: unknown) =>
    editor.setToken(row.path, { ...value, [name]: next });
  return (
    <div className={css.compositeField}>
      <span className={css.fieldName} aria-hidden="true">
        {fieldName}
      </span>
      {field.kind === "enum" ? (
        <EnumValueControl
          label={fieldLabel}
          definition={field}
          value={value[name]}
          optionKey={name}
          onChange={write}
        />
      ) : (
        <ReferenceControl
          label={fieldLabel}
          tokenPath={row.path}
          fieldPath={[name]}
          kind={field.kind}
          value={value[name]}
          tokenValue={row.value}
          allowLiteral={row.tier === "component"}
          onChange={write}
        />
      )}
    </div>
  );
}

function _sketchPreview(row: TokenRow) {
  return row.definition.kind === "sketchProfile" ? (
    <SketchPreview
      profile={row.resolved as ResolvedSketchProfile | undefined}
    />
  ) : null;
}

/** A composite that points at another composite, such as a sketch role. */
function CompositeReference({ row, label }: CompositeProps) {
  const editor = useTokenEditor();
  return (
    <div className={css.stack}>
      <ReferenceControl
        label={label}
        tokenPath={row.path}
        fieldPath={[]}
        kind={row.definition.kind}
        value={row.value}
        tokenValue={row.value}
        allowLiteral={false}
        onChange={(next) => editor.setToken(row.path, next)}
      />
      {_sketchPreview(row)}
    </div>
  );
}

/**
 * A composite token edited field by field (type style, paint, elevation,
 * sketch, box, motion step, camera preset, range). A composite that points
 * at another composite, such as a sketch role, is one reference picker.
 */
export function CompositeControl({ row, label }: CompositeProps) {
  if (isTokenReference(row.value)) {
    return <CompositeReference row={row} label={label} />;
  }
  const fields: Readonly<Record<string, FieldSpec>> =
    COMPOSITE_TOKEN_FIELDS[row.definition.kind as CompositeTokenKind].fields;
  const value = getCompositeFieldsFromValue(row.value);
  return (
    <fieldset className={css.composite}>
      <legend className={css.visuallyHidden}>{label}</legend>
      {row.definition.kind === "typeStyle" ? (
        <TypeSpecimen style={row.resolved as ResolvedTypeStyle | undefined} />
      ) : null}
      {_sketchPreview(row)}
      {Object.entries(fields).map(([name, field]) => (
        <CompositeField
          key={name}
          row={row}
          label={label}
          name={name}
          field={field}
          value={value}
        />
      ))}
    </fieldset>
  );
}

import { EditorCopy } from "../../../tokenCopy/EditorCopy";
import { useTokenEditor } from "../../../TokenEditorContext";
import { type TokenRow } from "../../../TokenRows/TokenRows.types";
import { EnumValueControl } from "../../EnumValueControl/EnumValueControl";
import { ReferenceControl } from "../../ReferenceControl/ReferenceControl";
import css from "./CompositeField.module.css";
import type { FieldSpec } from "../../../../videoTheme/tokenCatalog/TokenDefinitions";
import type { ReactNode } from "react";

type Props = Readonly<{
  row: TokenRow;
  label: string;
  name: string;
  field: FieldSpec;
  value: Readonly<Record<string, unknown>>;
}>;
/**
 * One field of a composite token: its name beside an enum menu or a reference
 * picker.
 */
export function CompositeField({
  row,
  label,
  name,
  field,
  value,
}: Props): ReactNode {
  const editor = useTokenEditor();
  const fieldName = EditorCopy.getFieldName(name);
  const fieldLabel = `${label}, ${fieldName}`;
  const write = (fieldValue: unknown) => {
    return editor.setToken(row.path, { ...value, [name]: fieldValue });
  };
  return (
    <div className={css.compositeField}>
      <span className={css.compositeFieldName} aria-hidden="true">
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

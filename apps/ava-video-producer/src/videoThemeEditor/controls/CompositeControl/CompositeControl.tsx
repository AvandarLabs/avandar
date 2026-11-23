import { ThemeReferences } from "../../../videoTheme/ThemeReferences/ThemeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  type CompositeTokenKind,
  type FieldSpec,
} from "../../../videoTheme/tokenCatalog/TokenDefinitions";
import { type TokenRow } from "../../TokenRows/TokenRows.types";
import { getCompositeFieldsFromValue } from "../roleValueHelpers/roleValueHelpers";
import { TypeSpecimen } from "../TypeSpecimen/TypeSpecimen";
import css from "./CompositeControl.module.css";
import { CompositeField } from "./CompositeField/CompositeField";
import { CompositeReference } from "./CompositeReference/CompositeReference";
import { CompositeSketchPreview } from "./CompositeSketchPreview";
import type { ResolvedTypeStyle } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = Readonly<{ row: TokenRow; label: string }>;
/**
 * A composite token edited field by field (type style, paint, elevation,
 * sketch, box, motion step, camera preset, range). A composite that points
 * at another composite, such as a sketch role, is one reference picker.
 */
export function CompositeControl({ row, label }: Props): ReactNode {
  if (ThemeReferences.isTokenReference(row.value)) {
    return <CompositeReference row={row} label={label} />;
  }
  const fields: Record<string, FieldSpec> =
    COMPOSITE_TOKEN_FIELDS[row.definition.kind as CompositeTokenKind].fields;
  const value = getCompositeFieldsFromValue(row.value);
  return (
    <fieldset className={css.compositeControl}>
      <legend className={css.compositeControlLegend}>{label}</legend>
      {row.definition.kind === "typeStyle" ? (
        <TypeSpecimen style={row.resolved as ResolvedTypeStyle | undefined} />
      ) : null}
      <CompositeSketchPreview row={row} />
      {Object.entries(fields).map(([name, field]) => {
        return (
          <CompositeField
            key={name}
            row={row}
            label={label}
            name={name}
            field={field}
            value={value}
          />
        );
      })}
    </fieldset>
  );
}

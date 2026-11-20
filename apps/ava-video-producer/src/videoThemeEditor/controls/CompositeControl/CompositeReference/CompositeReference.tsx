import { useTokenEditor } from "../../../TokenEditorContext";
import { type TokenRow } from "../../../tokenRows/tokenRows.types";
import { ReferenceControl } from "../../ReferenceControl/ReferenceControl";
import { CompositeSketchPreview } from "../CompositeSketchPreview";
import css from "./CompositeReference.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{ row: TokenRow; label: string }>;
/** A composite that points at another composite, such as a sketch role. */
export function CompositeReference({ row, label }: Props): ReactNode {
  const editor = useTokenEditor();
  return (
    <div className={css.compositeReferenceStack}>
      <ReferenceControl
        label={label}
        tokenPath={row.path}
        fieldPath={[]}
        kind={row.definition.kind}
        value={row.value}
        tokenValue={row.value}
        allowLiteral={false}
        onChange={(reference) => {
          return editor.setToken(row.path, reference);
        }}
      />
      <CompositeSketchPreview row={row} />
    </div>
  );
}

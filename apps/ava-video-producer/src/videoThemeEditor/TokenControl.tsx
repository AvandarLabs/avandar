import { isCompositeTokenKind } from "../videoTheme/tokenCatalog/defineTokensHelpers";
import { ColorRoleControl } from "./controls/ColorRoleControl/ColorRoleControl";
import { CompositeControl } from "./controls/CompositeControl/CompositeControl";
import { ReferenceControl } from "./controls/ReferenceControl/ReferenceControl";
import { ValueControl } from "./controls/ValueControl";
import { useTokenEditor } from "./TokenEditorContext";
import type { TokenRow } from "./tokenRows/tokenRows";

/**
 * The control for a token row: literal values in the atomic and Mantine
 * tiers (and for enums and switches anywhere), references above them.
 */
export function TokenControl({
  row,
  label,
}: Readonly<{ row: TokenRow; label: string }>) {
  const editor = useTokenEditor();
  const kind = row.definition.kind;
  const write = (next: unknown) => editor.setToken(row.path, next);
  if (
    row.tier === "atomic" ||
    row.tier === "mantine" ||
    kind === "enum" ||
    kind === "boolean"
  ) {
    return (
      <ValueControl
        label={label}
        definition={row.definition}
        value={row.value}
        optionKey={row.path}
        onChange={write}
      />
    );
  }
  if (kind === "color") {
    return <ColorRoleControl row={row} label={label} />;
  }
  if (isCompositeTokenKind(kind)) {
    return <CompositeControl row={row} label={label} />;
  }
  return (
    <ReferenceControl
      label={label}
      tokenPath={row.path}
      fieldPath={[]}
      kind={kind}
      value={row.value}
      tokenValue={row.value}
      allowLiteral={row.tier === "component"}
      definition={row.definition}
      onChange={write}
    />
  );
}

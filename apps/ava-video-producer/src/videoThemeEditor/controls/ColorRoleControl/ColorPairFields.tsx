import { getFieldName } from "../../tokenCopy/editorCopy";
import { useTokenEditor } from "../../TokenEditorContext";
import { ReferenceControl } from "../ReferenceControl/ReferenceControl";
import type { TokenRow } from "../../tokenRows/tokenRows";
import type { ColorPair } from "../roleValueHelpers/roleValueHelpers";
import type { ReactNode } from "react";

type Props = Readonly<{
  row: TokenRow;
  label: string;
  pair: ColorPair;
}>;

/** One picker per ground for a colour role that differs on light grounds. */
export function ColorPairFields({ row, label, pair }: Props): ReactNode {
  const editor = useTokenEditor();
  return (["onDark", "onLight"] as const).map((side) => {
    const sideName = getFieldName(side);
    return (
      <ReferenceControl
        key={side}
        label={`${label}, ${sideName}`}
        tokenPath={row.path}
        fieldPath={[side]}
        kind="color"
        value={pair[side]}
        tokenValue={row.value}
        allowLiteral={row.tier === "component"}
        onChange={(reference) => {
          return editor.setToken(row.path, { ...pair, [side]: reference });
        }}
      />
    );
  });
}

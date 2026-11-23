import { useTokenEditor } from "../../TokenEditorContext";
import { type TokenRow } from "../../TokenRows/TokenRows.types";
import { ContrastBadge } from "../ContrastBadge/ContrastBadge";
import { ReferenceControl } from "../ReferenceControl/ReferenceControl";
import { isColorPair } from "../roleValueHelpers/roleValueHelpers";
import { ColorPairFields } from "./ColorPairFields";
import { ColorPairingSwitch } from "./ColorPairingSwitch";
import css from "./ColorRoleControl.module.css";
import type { ReactNode } from "react";

const TEXT_COLOR_PATHS = new Set(["color.text", "color.textMuted"]);
type Props = Readonly<{
  row: TokenRow;
  label: string;
}>;
/**
 * A colour role: one reference, or one for dark grounds and one for light
 * grounds. Text colours show their contrast against the ground.
 */
export function ColorRoleControl({ row, label }: Props): ReactNode {
  const editor = useTokenEditor();
  const pair = isColorPair(row.value) ? row.value : undefined;
  return (
    <div className={css.colorRoleControlStack}>
      <ColorPairingSwitch row={row} />
      {pair ? (
        <ColorPairFields row={row} label={label} pair={pair} />
      ) : (
        <ReferenceControl
          label={label}
          tokenPath={row.path}
          fieldPath={[]}
          kind="color"
          value={row.value}
          tokenValue={row.value}
          allowLiteral={row.tier === "component"}
          definition={row.definition}
          onChange={(reference) => {
            return editor.setToken(row.path, reference);
          }}
        />
      )}
      {TEXT_COLOR_PATHS.has(row.path) && typeof row.resolved === "string" ? (
        <ContrastBadge color={row.resolved} />
      ) : null}
    </div>
  );
}

import { Switch } from "@mantine/core";
import {
  useRowHasIssue,
  useRowIssueAriaProps,
} from "../../RowIssueContext/RowIssueContext";
import { useTokenEditor } from "../../TokenEditorContext";
import { ContrastBadge } from "../ContrastBadge/ContrastBadge";
import { ReferenceControl } from "../ReferenceControl/ReferenceControl";
import {
  canPairColorRole,
  isColorPair,
  setColorPairing,
} from "../roleValueHelpers/roleValueHelpers";
import { ColorPairFields } from "./ColorPairFields";
import css from "./ColorRoleControl.module.css";
import type { TokenRow } from "../../tokenRows/tokenRows";

const TEXT_COLOR_PATHS = new Set(["color.text", "color.textMuted"]);

type Props = Readonly<{ row: TokenRow; label: string }>;

/**
 * A colour role: one reference, or one for dark grounds and one for light
 * grounds. Text colours show their contrast against the ground.
 */
export function ColorRoleControl({ row, label }: Props) {
  const editor = useTokenEditor();
  const hasIssue = useRowHasIssue();
  const issueAriaProps = useRowIssueAriaProps();
  const pair = isColorPair(row.value) ? row.value : undefined;
  const canPair = canPairColorRole(row.value);
  return (
    <div className={css.colorRoleStack}>
      <Switch
        size="xs"
        label="Use another colour on light backgrounds"
        error={hasIssue}
        {...issueAriaProps}
        checked={pair !== undefined}
        disabled={!canPair}
        description={canPair ? undefined : "Pick a colour first."}
        onChange={(event) => {
          return editor.setToken(
            row.path,
            setColorPairing(row.value, event.currentTarget.checked),
          );
        }}
      />
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

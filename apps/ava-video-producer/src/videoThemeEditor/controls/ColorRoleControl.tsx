import { useLingui } from "@lingui/react/macro";
import { Switch } from "@mantine/core";
import {
  useRowHasIssue,
  useRowIssueAriaProps,
} from "../RowIssueContext/RowIssueContext";
import { useFieldCopy } from "../tokenCopy/useEditorCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { ContrastBadge } from "./ContrastBadge";
import css from "./controls.module.css";
import { ReferenceControl } from "./ReferenceControl";
import {
  canPairColorRole,
  isColorPair,
  setColorPairing,
  type ColorPair,
} from "./roleValues/roleValues";
import type { TokenRow } from "../tokenRows/tokenRows";

const TEXT_COLOR_PATHS = new Set(["color.text", "color.textMuted"]);
const PAIR_SIDES = ["onDark", "onLight"] as const;

type RoleProps = Readonly<{ row: TokenRow; label: string }>;

/** One picker per ground for a colour role that differs on light grounds. */
function ColorPairFields({
  row,
  label,
  pair,
}: RoleProps & Readonly<{ pair: ColorPair }>) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const fieldCopy = useFieldCopy();
  return PAIR_SIDES.map((side) => {
    const sideName = fieldCopy(side);
    return (
      <ReferenceControl
        key={side}
        label={t`${label}, ${sideName}`}
        tokenPath={row.path}
        fieldPath={[side]}
        kind="color"
        value={pair[side]}
        tokenValue={row.value}
        allowLiteral={row.tier === "component"}
        onChange={(next) =>
          editor.setToken(row.path, { ...pair, [side]: next })
        }
      />
    );
  });
}

/**
 * A colour role: one reference, or one for dark grounds and one for light
 * grounds. Text colours show their contrast against the ground.
 */
export function ColorRoleControl({ row, label }: RoleProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const hasIssue = useRowHasIssue();
  const issueAriaProps = useRowIssueAriaProps();
  const pair = isColorPair(row.value) ? row.value : undefined;
  const canPair = canPairColorRole(row.value);
  return (
    <div className={css.stack}>
      <Switch
        size="xs"
        label={t`Use another colour on light backgrounds`}
        error={hasIssue}
        {...issueAriaProps}
        checked={pair !== undefined}
        disabled={!canPair}
        description={canPair ? undefined : t`Pick a colour first.`}
        onChange={(event) =>
          editor.setToken(
            row.path,
            setColorPairing(row.value, event.currentTarget.checked),
          )
        }
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
          onChange={(next) => editor.setToken(row.path, next)}
        />
      )}
      {TEXT_COLOR_PATHS.has(row.path) && typeof row.resolved === "string" ? (
        <ContrastBadge color={row.resolved} />
      ) : null}
    </div>
  );
}

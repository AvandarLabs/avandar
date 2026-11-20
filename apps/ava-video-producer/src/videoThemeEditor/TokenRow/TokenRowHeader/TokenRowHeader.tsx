import { ActionIcon } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import { clsx } from "clsx";
import { formatTokenValue } from "../../formatTokenValue/formatTokenValue";
import { useTokenEditor } from "../../TokenEditorContext";
import { type TokenRow } from "../../tokenRows/tokenRows.types";
import { OverrideDot } from "./OverrideDot/OverrideDot";
import css from "./TokenRowHeader.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{
  row: TokenRow;
  label: string;
  isInherited: boolean;
  hasIssue: boolean;
}>;
/** A row's name, state, current value, and reset action. */
export function TokenRowHeader({
  row,
  label,
  isInherited,
  hasIssue,
}: Props): ReactNode {
  const editor = useTokenEditor();
  const kind = row.definition.kind;
  const value = formatTokenValue({ kind, value: row.resolved });
  const itemValue =
    row.itemOverride &&
    formatTokenValue({ kind, value: row.itemOverride.resolved });
  const toValueText = (): string => {
    if (hasIssue) {
      return `Last working value: ${value}`;
    }
    return itemValue ? `Used here: ${itemValue}` : value;
  };
  return (
    <div className={css.tokenRowHeader}>
      <span
        className={clsx(
          css.tokenRowHeaderLabel,
          isInherited && css.tokenRowHeaderLabelInherited,
        )}
      >
        {label}
      </span>
      <OverrideDot state={row.overrideState} />
      {isInherited ? (
        <span className={css.tokenRowHeaderInheritedTag}>
          {"Same as the theme"}
        </span>
      ) : null}
      <span className={css.tokenRowHeaderValue}>{toValueText()}</span>
      {row.overrideState === "draft" ? (
        <ActionIcon
          size="sm"
          variant="subtle"
          aria-label={`Reset ${label}`}
          title={`Reset ${label}`}
          onClick={() => {
            return editor.resetToken(row.path);
          }}
        >
          <IconArrowBackUp size={14} aria-hidden="true" />
        </ActionIcon>
      ) : null}
    </div>
  );
}

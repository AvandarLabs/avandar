import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconAlertCircle, IconArrowBackUp } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useId } from "react";
import { formatTokenValue } from "../formatTokenValue/formatTokenValue";
import { TokenControl } from "../TokenControl/TokenControl";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import {
  findTokenRowIssue,
  type TokenRow as TokenRowModel,
} from "../tokenRows/tokenRows";
import css from "./TokenRow.module.css";
import type { VideoThemeIssue } from "../../videoTheme/videoTheme.types";

/** A row's visible name: the catalog label, plus the key for a scale entry. */
export function useTokenRowLabel(): (row: TokenRowModel) => string {
  const copy = useTokenCopy();
  return useCallback(
    (row: TokenRowModel) =>
      row.scaleKey === undefined
        ? copy(row.definition.label)
        : `${copy(row.definition.label)} · ${row.scaleKey}`,
    [copy],
  );
}

function OverrideDot({
  state,
}: Readonly<{ state: TokenRowModel["overrideState"] }>) {
  const { t } = useLingui();
  if (state === "none") {
    return null;
  }
  return (
    <span
      className={clsx(css.dot, state === "saved" && css.dotSaved)}
      role="img"
      aria-label={
        state === "draft"
          ? t`Edited, not saved`
          : t`Saved override for this item`
      }
    />
  );
}

type HeaderProps = Readonly<{
  row: TokenRowModel;
  label: string;
  isInherited: boolean;
}>;

function TokenRowHeader({ row, label, isInherited }: HeaderProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  return (
    <div className={css.header}>
      <span className={css.label}>{label}</span>
      <OverrideDot state={row.overrideState} />
      {isInherited ? (
        <span className={css.inheritedTag}>{t`Inherited`}</span>
      ) : null}
      <span className={css.value}>
        {formatTokenValue(row.definition.kind, row.resolved)}
      </span>
      {row.overrideState === "draft" ? (
        <ActionIcon
          size="sm"
          variant="subtle"
          aria-label={t`Reset ${label}`}
          title={t`Reset ${label}`}
          onClick={() => editor.resetToken(row.path)}
        >
          <IconArrowBackUp size={14} aria-hidden="true" />
        </ActionIcon>
      ) : null}
    </div>
  );
}

function TokenRowIssue({
  id,
  issue,
}: Readonly<{ id: string; issue: VideoThemeIssue }>) {
  const { t } = useLingui();
  return (
    <p id={id} className={css.issue} role="alert">
      <IconAlertCircle className={css.issueIcon} size={14} aria-hidden="true" />
      <span>
        {t`This value does not resolve.`}{" "}
        <code className={css.issueMessage}>{issue.message}</code>
      </span>
    </p>
  );
}

/**
 * One token: its name and state, its control, its path and description, and
 * any problem. An inherited item-scope value shows muted text and an
 * "Inherited" tag. A problem puts the control in its error state and adds an
 * alert line the control is described by.
 */
export function TokenRow({ row }: Readonly<{ row: TokenRowModel }>) {
  const copy = useTokenCopy();
  const editor = useTokenEditor();
  const issueId = useId();
  const label = useTokenRowLabel()(row);
  const issue = findTokenRowIssue(editor.issues, row.path);
  const isInherited =
    editor.scope.kind === "item" && row.overrideState === "none";
  return (
    <div
      className={clsx(
        css.row,
        isInherited && css.inherited,
        issue && css.hasIssue,
      )}
      data-token-path={row.path}
    >
      <TokenRowHeader row={row} label={label} isInherited={isInherited} />
      <div
        className={css.control}
        role="group"
        aria-label={label}
        aria-describedby={issue ? issueId : undefined}
      >
        <TokenControl row={row} label={label} />
      </div>
      <p className={css.meta}>
        <code className={css.path}>{row.path}</code>{" "}
        {copy(row.definition.description)}
      </p>
      {issue ? <TokenRowIssue id={issueId} issue={issue} /> : null}
    </div>
  );
}

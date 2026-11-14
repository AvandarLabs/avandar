import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconAlertCircle, IconArrowBackUp } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback } from "react";
import { humanizeScaleKey } from "../customScaleKey/customScaleKey";
import { formatTokenValue } from "../formatTokenValue/formatTokenValue";
import { RowIssueContext } from "../RowIssueContext/RowIssueContext";
import { TokenControl } from "../TokenControl/TokenControl";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import {
  describeRowIssue,
  findTokenRowIssue,
  type TokenRow as TokenRowModel,
} from "../tokenRows/tokenRows";
import css from "./TokenRow.module.css";
import type {
  TokenKind,
  VideoThemeIssue,
} from "../../videoTheme/videoTheme.types";

/** A row's visible name: the catalog label, plus the key for a scale entry. */
export function useTokenRowLabel(): (row: TokenRowModel) => string {
  const copy = useTokenCopy();
  return useCallback(
    (row: TokenRowModel) =>
      row.scaleKey === undefined
        ? copy(row.definition.label)
        : `${copy(row.definition.label)} · ${humanizeScaleKey(row.scaleKey)}`,
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
          : t`Saved for this motion or composition only`
      }
    />
  );
}

type HeaderProps = Readonly<{
  row: TokenRowModel;
  label: string;
  isInherited: boolean;
  hasIssue: boolean;
}>;

function TokenRowHeader({ row, label, isInherited, hasIssue }: HeaderProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const kind = row.definition.kind;
  const value = formatTokenValue(kind, row.resolved);
  const itemValue =
    row.itemOverride && formatTokenValue(kind, row.itemOverride.resolved);
  const toValueText = (): string => {
    if (hasIssue) {
      return t`Last working value: ${value}`;
    }
    return itemValue ? t`Used here: ${itemValue}` : value;
  };
  return (
    <div className={css.header}>
      <span className={css.label}>{label}</span>
      <OverrideDot state={row.overrideState} />
      {isInherited ? (
        <span className={css.inheritedTag}>{t`Same as the theme`}</span>
      ) : null}
      <span className={css.value}>{toValueText()}</span>
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

/**
 * In theme scope, says the previewed item has its own value, so the control
 * below edits the theme's value and not the one the preview shows.
 */
function ItemOverrideNote({ label }: Readonly<{ label: string }>) {
  const { t } = useLingui();
  const { item } = useTokenEditor();
  if (!item) {
    return null;
  }
  const itemName = item.name;
  const scopeLabel = item.scopeLabel;
  const settingName = label.toLowerCase();
  return (
    <p className={css.itemNote}>
      {t`${itemName} has its own ${settingName}. Choose "${scopeLabel}" to change it.`}
    </p>
  );
}

function useIssueSentence(): (
  issue: VideoThemeIssue,
  kind: TokenKind,
) => string {
  const { t } = useLingui();
  return (issue, kind) => {
    const description = describeRowIssue(issue);
    if (description.kind === "missingReference") {
      return kind === "color" || kind === "fill"
        ? t`This colour is missing. Pick another.`
        : t`This value is missing. Pick another.`;
    }
    return description.kind === "loop"
      ? t`This value points back at itself. Pick another.`
      : t`This value cannot be used.`;
  };
}

/** A problem in plain words, with the resolver's own message as secondary detail. */
function TokenRowIssue({
  issue,
  kind,
}: Readonly<{ issue: VideoThemeIssue; kind: TokenKind }>) {
  const toSentence = useIssueSentence();
  return (
    <div className={css.issue} role="alert">
      <IconAlertCircle className={css.issueIcon} size={14} aria-hidden="true" />
      <div>
        <p className={css.issueSentence}>{toSentence(issue, kind)}</p>
        <code className={css.issueMessage}>{issue.message}</code>
      </div>
    </div>
  );
}

/**
 * One token: its name and state, its control, its path and description, and
 * any problem. An inherited item-scope value shows muted text and an
 * "Same as the theme" tag, and its chips and previews dim. A problem puts the
 * control's inputs in Mantine's error state and adds an alert line.
 */
export function TokenRow({ row }: Readonly<{ row: TokenRowModel }>) {
  const copy = useTokenCopy();
  const editor = useTokenEditor();
  const label = useTokenRowLabel()(row);
  const issue = findTokenRowIssue(editor.issues, row.path);
  const isInherited =
    editor.scope.kind === "item" && row.overrideState === "none";
  return (
    <div
      className={clsx(css.row, isInherited && css.inherited)}
      data-token-path={row.path}
    >
      <TokenRowHeader
        row={row}
        label={label}
        isInherited={isInherited}
        hasIssue={issue !== undefined}
      />
      {row.itemOverride ? <ItemOverrideNote label={label} /> : null}
      <RowIssueContext.Provider value={issue !== undefined}>
        <TokenControl row={row} label={label} />
      </RowIssueContext.Provider>
      <p className={css.meta}>
        <code className={css.path}>{row.path}</code>{" "}
        {copy(row.definition.description)}
      </p>
      {issue ? (
        <TokenRowIssue issue={issue} kind={row.definition.kind} />
      ) : null}
    </div>
  );
}

import { useLingui } from "@lingui/react/macro";
import { Text, UnstyledButton } from "@mantine/core";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { ReactNode } from "react";

type Props = {
  match: DictionaryMatch.T;
  isPicked: boolean;
  /** The id of the column name this match is for. */
  describedById: string;
  onPick: () => void;
};

/**
 * One dictionary's best match for a column, as a toggle: the entry, its
 * code list, and how much of the column the list covers. Pressing the
 * picked match again clears it.
 */
export function MatchPickButton({
  match,
  isPicked,
  describedById,
  onPick,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const { entryName, codeListName } = match;
  const what =
    codeListName === undefined
      ? t`${entryName} · description`
      : t`${entryName} · ${codeListName}`;
  const fitText =
    match.fit === "values_dont_fit"
      ? t`values don't fit`
      : match.coverage === undefined
        ? undefined
        : i18n.number(match.coverage, {
            style: "percent",
            maximumFractionDigits: 0,
          });
  return (
    <UnstyledButton
      className={css.matchPick}
      data-picked={isPicked}
      aria-pressed={isPicked}
      aria-describedby={describedById}
      onClick={onPick}
    >
      <span className={css.matchPickRadio} aria-hidden />
      <Text span size="sm" className={css.matchPickText}>
        {what}
      </Text>
      {fitText ? (
        <Text span size="xs" c="dimmed">
          {fitText}
        </Text>
      ) : null}
    </UnstyledButton>
  );
}

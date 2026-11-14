import { useLingui } from "@lingui/react/macro";
import { Accordion, Button } from "@mantine/core";
import { useMemo, useState } from "react";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import { getDefaultLiteralFromKind } from "../controls/defaultLiterals";
import { useGroupCopy } from "../tokenCopy/useEditorCopy";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { TokenRow } from "../TokenRow/TokenRow";
import {
  buildNextCustomScaleKey,
  groupTokenRows,
  type TokenRow as TokenRowModel,
  type TokenRowGroup,
} from "../tokenRows/tokenRows";
import css from "./VideoThemeEditor.module.css";

function useGroupName(): (group: string) => string {
  const groupCopy = useGroupCopy();
  const copy = useTokenCopy();
  return (group) => {
    const [tier, name] = group.split(":");
    const scaleLabel =
      tier === "atomic"
        ? getTokenDefinitionFromPath(`atomic.${name}.entry`)?.label
        : undefined;
    return groupCopy(group) ?? (scaleLabel ? copy(scaleLabel) : name);
  };
}

type SectionProps = TokenRowGroup &
  Readonly<{
    /** Every row in the editor, unfiltered, so new keys never collide. */
    allRows: readonly TokenRowModel[];
  }>;

function AddScaleValue({ group, allRows }: SectionProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const scalePath = `atomic.${group.split(":")[1]}`;
  const kind = getTokenDefinitionFromPath(`${scalePath}.entry`)?.kind;
  if (!kind) {
    return null;
  }
  return (
    <Button
      size="compact-xs"
      variant="subtle"
      onClick={() =>
        editor.setToken(
          `${scalePath}.${buildNextCustomScaleKey(allRows, group)}`,
          getDefaultLiteralFromKind(kind),
        )
      }
    >
      {t`Add value`}
    </Button>
  );
}

function SectionRows({ group, rows, allRows }: SectionProps) {
  return (
    <>
      {rows.map((row) => (
        <TokenRow key={row.path} row={row} />
      ))}
      {group.startsWith("atomic:") ? (
        <AddScaleValue group={group} rows={rows} allRows={allRows} />
      ) : null}
    </>
  );
}

/** Sections for the visible rows, then the empty scales after them. */
function useSectionGroups(
  rows: readonly TokenRowModel[],
  emptyGroups: readonly string[],
): readonly TokenRowGroup[] {
  return useMemo(
    () => [
      ...groupTokenRows(rows),
      ...emptyGroups.map((group) => ({ group, rows: [] })),
    ],
    [rows, emptyGroups],
  );
}

/**
 * Rows grouped into accordion sections. Only open sections render their
 * rows, so a long tier stays fast. Atomic sections can add a value.
 */
export function TokenSections({
  rows,
  allRows,
  emptyGroups,
}: Readonly<{
  /** The rows to show, after search and filters. */
  rows: readonly TokenRowModel[];
  /** Every row, for choosing a free key when a value is added. */
  allRows: readonly TokenRowModel[];
  emptyGroups: readonly string[];
}>) {
  const { t } = useLingui();
  const groupName = useGroupName();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const groups = useSectionGroups(rows, emptyGroups);
  if (groups.length === 0) {
    return <p className={css.empty}>{t`No settings match.`}</p>;
  }
  return (
    <Accordion
      multiple
      value={openGroups}
      onChange={setOpenGroups}
      classNames={{
        item: css.section,
        control: css.sectionControl,
        panel: css.sectionPanel,
      }}
    >
      {groups.map(({ group, rows: grouped }) => (
        <Accordion.Item key={group} value={group}>
          <Accordion.Control>
            {groupName(group)}{" "}
            <span className={css.count}>{grouped.length}</span>
          </Accordion.Control>
          <Accordion.Panel>
            {openGroups.includes(group) ? (
              <SectionRows group={group} rows={grouped} allRows={allRows} />
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

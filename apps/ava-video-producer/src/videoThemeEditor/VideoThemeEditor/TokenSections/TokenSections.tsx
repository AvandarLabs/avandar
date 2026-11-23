import { Accordion } from "@mantine/core";
import { useMemo, useState, type ReactNode } from "react";
import { TokenCatalog } from "../../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import { EditorCopy } from "../../tokenCopy/EditorCopy";
import { TokenRows } from "../../TokenRows/TokenRows";
import {
  type TokenRow,
  type TokenRowGroup,
} from "../../TokenRows/TokenRows.types";
import { SectionRows } from "./SectionRows";
import css from "./TokenSections.module.css";

type Props = {
  /** The rows to show, after search and filters. */
  rows: readonly TokenRow[];
  /** Every row, for choosing a free key when a value is added. */
  allRows: readonly TokenRow[];
  emptyGroups: readonly string[];
};
/** Display name for a token group key such as `atomic:color`. */
function _groupToName(group: string): string {
  const [tier, name] = group.split(":");
  const scaleLabel =
    tier === "atomic"
      ? TokenCatalog.getTokenDefinitionFromPath(`atomic.${name}.entry`)?.label
      : undefined;
  return EditorCopy.getGroupName(group) ?? (scaleLabel ? scaleLabel : name);
}
/** Sections for the visible rows, then the empty scales after them. */
function useSectionGroups({
  rows,
  emptyGroups,
}: Readonly<{
  rows: readonly TokenRow[];
  emptyGroups: readonly string[];
}>): TokenRowGroup[] {
  return useMemo(() => {
    return [
      ...TokenRows.groupTokenRows(rows),
      ...emptyGroups.map((group) => {
        return { group, rows: [] };
      }),
    ];
  }, [rows, emptyGroups]);
}
/**
 * Rows grouped into accordion sections. Only open sections render their
 * rows, so a long tier stays fast. Atomic sections can add a value.
 */
export function TokenSections({
  rows,
  allRows,
  emptyGroups,
}: Readonly<Props>): ReactNode {
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const openGroupSet = new Set(openGroups);
  const groups = useSectionGroups({
    rows,
    emptyGroups,
  });
  if (groups.length === 0) {
    return <p className={css.tokenSectionsEmpty}>{"No settings match."}</p>;
  }
  return (
    <Accordion
      multiple
      value={openGroups}
      onChange={setOpenGroups}
      classNames={{
        item: css.tokenSectionsSection,
        control: css.tokenSectionsSectionControl,
        panel: css.tokenSectionsSectionPanel,
      }}
    >
      {groups.map(({ group, rows: grouped }) => {
        return (
          <Accordion.Item key={group} value={group}>
            <Accordion.Control>
              {_groupToName(group)}{" "}
              <span className={css.tokenSectionsSectionCount}>
                {grouped.length}
              </span>
            </Accordion.Control>
            <Accordion.Panel>
              {openGroupSet.has(group) ? (
                <SectionRows group={group} rows={grouped} allRows={allRows} />
              ) : null}
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

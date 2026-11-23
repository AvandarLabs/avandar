import { Accordion } from "@mantine/core";
import { useMemo, useState } from "react";
import { getTokenDefinitionFromPath } from "../../../videoTheme/tokenCatalog/tokenCatalogHelpers";
import { getGroupName } from "../../tokenCopy/editorCopy";
import {
  groupTokenRows,
  type TokenRow as TokenRowModel,
  type TokenRowGroup,
} from "../../tokenRows/tokenRows";
import { SectionRows } from "./SectionRows";
import css from "./TokenSections.module.css";

/** Display name for a token group key such as `atomic:color`. */
function _groupToName(group: string): string {
  const [tier, name] = group.split(":");
  const scaleLabel =
    tier === "atomic"
      ? getTokenDefinitionFromPath(`atomic.${name}.entry`)?.label
      : undefined;
  return getGroupName(group) ?? (scaleLabel ? scaleLabel : name);
}

/** Sections for the visible rows, then the empty scales after them. */
function useSectionGroups(
  rows: readonly TokenRowModel[],
  emptyGroups: readonly string[],
): TokenRowGroup[] {
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
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const groups = useSectionGroups(rows, emptyGroups);
  if (groups.length === 0) {
    return <p className={css.tokenSectionsEmpty}>{"No settings match."}</p>;
  }
  return (
    <Accordion
      multiple
      value={openGroups}
      onChange={setOpenGroups}
      classNames={{
        item: css.tokenSection,
        control: css.tokenSectionControl,
        panel: css.tokenSectionPanel,
      }}
    >
      {groups.map(({ group, rows: grouped }) => (
        <Accordion.Item key={group} value={group}>
          <Accordion.Control>
            {_groupToName(group)}{" "}
            <span className={css.tokenSectionCount}>{grouped.length}</span>
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

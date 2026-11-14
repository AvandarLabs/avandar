import { useLingui } from "@lingui/react/macro";
import { Accordion, Button } from "@mantine/core";
import { useState } from "react";
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

function AddScaleValue({ group, rows }: TokenRowGroup) {
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
          `${scalePath}.${buildNextCustomScaleKey(rows)}`,
          getDefaultLiteralFromKind(kind),
        )
      }
    >
      {t`Add value`}
    </Button>
  );
}

function SectionRows({ group, rows }: TokenRowGroup) {
  return (
    <>
      {rows.map((row) => (
        <TokenRow key={row.path} row={row} />
      ))}
      {group.startsWith("atomic:") ? (
        <AddScaleValue group={group} rows={rows} />
      ) : null}
    </>
  );
}

/**
 * Rows grouped into accordion sections. Only open sections render their
 * rows, so a long tier stays fast. Atomic sections can add a value.
 */
export function TokenSections({
  rows,
  emptyGroups,
}: Readonly<{
  rows: readonly TokenRowModel[];
  emptyGroups: readonly string[];
}>) {
  const { t } = useLingui();
  const groupName = useGroupName();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const groups: readonly TokenRowGroup[] = [
    ...groupTokenRows(rows),
    ...emptyGroups.map((group) => ({ group, rows: [] })),
  ];
  if (groups.length === 0) {
    return <p className={css.empty}>{t`No tokens match.`}</p>;
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
              <SectionRows group={group} rows={grouped} />
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

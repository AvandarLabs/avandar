import { NavLinkList } from "@avandar/ui";
import { ScrollArea } from "@mantine/core";
import fixtures from "../../fixtures.json";
import { record } from "../CasesScreen.constants";
import css from "./CaseRecordSidebar.module.css";
import type { ReactNode } from "react";

type Props = { selected: boolean };
/** Show all fictional records and the frame-controlled selected case. */
export function CaseRecordSidebar({ selected }: Readonly<Props>): ReactNode {
  return (
    <div className={css.caseRecordSidebarPane}>
      <ScrollArea h="100%" w="100%">
        <NavLinkList
          pr="md"
          pl="xs"
          gap="xs"
          inactiveHoverColor="neutral.1"
          className={css.caseRecordSidebarList}
          links={fixtures.cases.map((item) => {
            return {
              key: item.case_id,
              label: item.case_label,
              to: "/",
              "data-record": item.case_id,
              active: selected && item.case_id === record.case_id,
              style: { height: 50 },
            };
          })}
        />
      </ScrollArea>
    </div>
  );
}

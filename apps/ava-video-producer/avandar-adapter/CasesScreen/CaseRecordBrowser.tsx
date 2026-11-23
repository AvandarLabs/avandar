import { Center, Flex, ScrollArea } from "@mantine/core";
import { IndividualSelectionEmptyState } from "@/views/IndividualManagerApp/IndividualSelectionEmptyState/IndividualSelectionEmptyState";
import { CaseRecordSidebar } from "./CaseRecordSidebar/CaseRecordSidebar";
import { caseType, record, fields } from "./CasesScreen.constants";
import { RecordDetail } from "./RecordDetail";
import type { ReactNode } from "react";

type Props = { frame: number; height: number };
/** Switch from the genuine selection placeholder to the chosen case detail. */
export function CaseRecordBrowser({
  frame,
  height,
}: Readonly<Props>): ReactNode {
  const selected = frame >= 358;
  return (
    <Flex align="stretch" h="100%">
      <CaseRecordSidebar selected={selected} />
      <ScrollArea h="100%" w="100%">
        {selected ? (
          <RecordDetail
            frame={frame}
            caseLabel={record.case_label}
            fields={fields}
          />
        ) : (
          <Center h={height} px="md">
            <IndividualSelectionEmptyState
              conceptName={caseType.name}
              hasRecords
            />
          </Center>
        )}
      </ScrollArea>
    </Flex>
  );
}

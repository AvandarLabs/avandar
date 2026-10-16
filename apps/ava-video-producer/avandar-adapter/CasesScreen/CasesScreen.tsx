import { NavLinkList } from "@avandar/ui";
import { Center, Flex, ScrollArea } from "@mantine/core";
import { useLayoutEffect, useRef } from "react";
import sidebarCss from "@/views/IndividualManagerApp/IndividualNavbar.module.css";
import { IndividualSelectionEmptyState } from "@/views/IndividualManagerApp/IndividualSelectionEmptyState/IndividualSelectionEmptyState";
import { CaseTypeHome } from "@/views/OntologyDesignerApp/CaseTypeHome/CaseTypeHome";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import { ConceptNavbar } from "@/views/OntologyDesignerApp/ConceptNavbar";
import fixtures from "../fixtures.json";
import { CaseTypeDetails } from "./CaseTypeDetails";
import css from "./CasesScreen.module.css";
import { RecordDetail } from "./RecordDetail";
import type { ComponentProps } from "react";
import "@mantine/tiptap/styles.css";

const _noop = () => undefined;
const caseType = {
  id: "0239e74b-cd03-4b78-8fa3-5cb10ff02919",
  name: "Video - Harborfield response case - pilot",
  description:
    "Fictional Harborfield response records linked to visit activity by case_id.",
};
const casesSource = "Video - Harborfield cases";
const visitsSource = "Video - Harborfield visits";
const record = fixtures.cases.find((item) => item.case_id === "HF-0001")!;
const kits = fixtures.visits
  .filter((item) => item.case_id === record.case_id)
  .reduce((total, item) => total + Number(item.supply_kits_delivered), 0);
const fields = [
  {
    name: "case_label",
    value: record.case_label,
    sourceName: casesSource,
    isLabel: true,
  },
  {
    name: "district_name",
    value: record.district_name,
    sourceName: casesSource,
  },
  {
    name: "referral_status",
    value: record.referral_status,
    sourceName: casesSource,
  },
  { name: "supply_kits_delivered", value: kits, sourceName: visitsSource },
  {
    name: "case_id",
    value: record.case_id,
    sourceName: casesSource,
    isIdentifier: true,
  },
  {
    name: "case_id",
    value: record.case_id,
    sourceName: visitsSource,
    isIdentifier: true,
  },
];
const datasets = [
  { id: "cases", name: casesSource },
  { id: "visits", name: visitsSource },
] as unknown as NonNullable<
  ComponentProps<typeof CaseTypeAttributesList>["datasets"]
>;
const attributes = fields.map((field, index) => ({
  id: `field-${index}`,
  name: field.name,
  description: undefined,
  isLabel: field.isLabel ?? false,
  isIdentifier: field.isIdentifier ?? false,
  mappingType: "dataset_column",
  mapping: {
    type: "dataset_column",
    datasetId: field.sourceName === casesSource ? "cases" : "visits",
  },
})) as unknown as NonNullable<
  ComponentProps<typeof CaseTypeAttributesList>["attributes"]
>;

/** Body-local times. The movie's cursor measures these targets after rendering. */
export const CASES_BEATS = [
  { frame: 90, target: "cases-type", action: "click" },
  { frame: 250, target: "cases-view-records", action: "click" },
  { frame: 350, target: "cases-record-001", action: "click" },
  { frame: 470, target: "cases-visit-value", action: "point" },
] as const;
export const CASES_DURATION = 660;

/** Real Case Manager leaves with approved, deterministic dataset values. */
export function CasesScreen({
  frame,
  width,
  height,
}: {
  frame: number;
  width: number;
  height: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(function markCasesVideoTargets() {
    const homeButton = [
      ...(root.current?.querySelectorAll("button") ?? []),
    ].find((button) => button.textContent?.startsWith(caseType.name));
    homeButton?.setAttribute("data-video-target", "cases-type");
    const firstRecord = root.current?.querySelector('a[data-record="HF-0001"]');
    firstRecord?.setAttribute("data-video-target", "cases-record-001");
    root.current?.querySelectorAll('[role="listitem"]').forEach((item) => {
      if (item.textContent?.includes("supply_kits_delivered"))
        item.setAttribute("data-video-target", "cases-visit-value");
    });
  }, [frame]);
  const selected = frame >= 358;
  return (
    <div
      ref={root}
      style={{
        width,
        height,
        overflow: "hidden",
        background: "var(--mantine-color-neutral-0)",
      }}
    >
      {frame < 98 ? (
        <div className={css.caseTypeHomePane}>
          <CaseTypeHome
            caseTypes={[caseType]}
            onCreate={_noop}
            onOpenCaseType={_noop}
            onDeleteCaseType={_noop}
          />
        </div>
      ) : frame < 258 ? (
        <Flex align="stretch" h="100%">
          <ConceptNavbar
            miw={240}
            concepts={
              [caseType] as unknown as ComponentProps<
                typeof ConceptNavbar
              >["concepts"]
            }
            isLoading={false}
          />
          <ScrollArea h="100%" w="100%">
            <CaseTypeDetails
              caseType={caseType}
              attributes={attributes}
              datasets={datasets}
            />
          </ScrollArea>
        </Flex>
      ) : (
        <Flex align="stretch" h="100%">
          <div className={`${sidebarCss.pane} ${css.casesSidebarPane}`}>
            <ScrollArea h="100%" w="100%">
              <NavLinkList
                pr="md"
                pl="xs"
                gap="xs"
                inactiveHoverColor="neutral.1"
                className={sidebarCss.list}
                links={fixtures.cases.map((item) => ({
                  key: item.case_id,
                  label: item.case_label,
                  to: "/",
                  "data-record": item.case_id,
                  active: selected && item.case_id === record.case_id,
                  style: { height: 50 },
                }))}
              />
            </ScrollArea>
          </div>
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
      )}
    </div>
  );
}

export { CasesScreen as Screen };

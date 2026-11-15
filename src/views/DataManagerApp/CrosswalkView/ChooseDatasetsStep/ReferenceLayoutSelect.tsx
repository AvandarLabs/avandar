import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { canChangeReference } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer";
import { useLayoutNamer } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/useLayoutNamer";
import type { CrosswalkFlow } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkFlow/useCrosswalkFlow";
import type { ReactNode } from "react";

type Props = {
  draft: CrosswalkDraft.T;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  dispatch: CrosswalkFlow["dispatch"];
};

/**
 * "Matches {percent} of the columns in the other datasets." for the
 * reference, weighted by how many datasets each other layout holds, or
 * undefined when there is no other dataset to cover.
 */
function useCoverageText(
  draft: CrosswalkDraft.T,
  reference: CrosswalkDraft.Layout | undefined,
): string | undefined {
  const { t, i18n } = useLingui();
  if (!reference) {
    return undefined;
  }
  const others = draft.layouts
    .filter((layout) => {
      return layout.id !== reference.id && layout.datasetIds.length > 0;
    })
    .map((layout) => {
      return {
        columnNames: layout.columnNames,
        datasetCount: layout.datasetIds.length,
      };
    });
  const coverage = CrosswalkLayout.getCoverage({
    candidate: reference.columnNames,
    others,
  });
  if (coverage.totalCount === 0) {
    return undefined;
  }
  const percent = i18n.number(coverage.matchedCount / coverage.totalCount, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  return t`Matches ${percent} of the columns in the other datasets.`;
}

/**
 * The layout whose columns seed the combined dataset. Once a layout other
 * than the reference is mapped it is read-only, and stays focusable so its
 * description says why.
 */
export function ReferenceLayoutSelect({
  draft,
  datasetsById,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const nameLayout = useLayoutNamer(datasetsById);
  const reference = CrosswalkDraft.getReferenceLayout(draft);
  const coverageText = useCoverageText(draft, reference);
  const isLocked = !canChangeReference(draft);
  return (
    <Select
      label={t`Reference layout`}
      maw={420}
      data={draft.layouts.map((layout) => {
        return { value: layout.id, label: nameLayout(layout) };
      })}
      value={reference?.id ?? null}
      allowDeselect={false}
      readOnly={isLocked}
      description={
        isLocked
          ? t`You confirmed mappings against this layout, so the reference can't change.`
          : coverageText
      }
      onChange={(value) => {
        if (value && value !== reference?.id) {
          // The options' values are the layouts' ids.
          dispatch({
            type: "reference_chosen",
            layoutId: value as CrosswalkLayout.Id,
          });
        }
      }}
    />
  );
}

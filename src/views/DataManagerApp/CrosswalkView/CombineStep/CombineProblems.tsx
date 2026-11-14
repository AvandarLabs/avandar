import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { List, VisuallyHidden } from "@mantine/core";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useId } from "react";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkProblem } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  problems: readonly CrosswalkProblem[];
  draft: CrosswalkDraft.T;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
};

/** How much a problem matters: it blocks the save, changes data, or informs. */
type ProblemWeight = "blocks" | "changes" | "informs";

function _getWeight(problem: CrosswalkProblem): ProblemWeight {
  switch (problem.kind) {
    case "invalid_expression":
    case "nothing_to_combine":
      return "blocks";
    case "columns_changed":
    case "column_types_differ":
    case "missing_code_list":
      return "changes";
    case "unconfirmed":
    case "skipped":
      return "informs";
  }
}

function _toProblemKey(problem: CrosswalkProblem): string {
  if (
    problem.kind === "columns_changed" ||
    problem.kind === "column_types_differ"
  ) {
    return `${problem.kind}:${problem.datasetId}`;
  }
  if (
    problem.kind === "invalid_expression" ||
    problem.kind === "missing_code_list"
  ) {
    return `${problem.kind}:${problem.layoutId}:${problem.columnId}`;
  }
  return problem.kind;
}

function ProblemIcon({
  weight,
}: Readonly<{ weight: ProblemWeight }>): ReactNode {
  if (weight === "blocks") {
    return (
      <IconAlertCircle
        size={16}
        color="var(--mantine-color-danger-7)"
        aria-hidden
      />
    );
  }
  if (weight === "changes") {
    return (
      <IconAlertTriangle
        size={16}
        color="var(--mantine-color-warning-7)"
        aria-hidden
      />
    );
  }
  return (
    <IconInfoCircle size={16} color="var(--mantine-color-dimmed)" aria-hidden />
  );
}

/**
 * The names a problem's sentence uses: its column, and its layout's name,
 * which is the layout's first dataset's (`getLayoutLabel`). A layout the
 * compile reports on always holds a dataset.
 */
function _getNames(
  props: Readonly<Props>,
  problem: Extract<CrosswalkProblem, { layoutId: CrosswalkLayout.Id }>,
): { columnName: string; layoutName: string } {
  const column = props.draft.columns.find((candidate) => {
    return candidate.id === problem.columnId;
  });
  const layout = props.draft.layouts.find((candidate) => {
    return candidate.id === problem.layoutId;
  });
  return {
    columnName: column?.name ?? "",
    layoutName: layout
      ? (getLayoutLabel(layout, props.datasetsById).firstDatasetName ?? "")
      : "",
  };
}

type DatasetProblem = Extract<
  CrosswalkProblem,
  { kind: "columns_changed" | "column_types_differ" }
>;

/**
 * The sentence for a dataset the compile left out. A dataset the catalog no
 * longer holds can't be read, and its name is only its id, so it is not
 * named. The sentence for it does not promise the combine goes ahead without
 * it: the combine step refuses someone who can't open every dataset.
 */
function useDatasetProblemSentence(
  datasetsById: Props["datasetsById"],
): (problem: DatasetProblem) => string {
  const { t } = useLingui();
  return (problem) => {
    const { datasetName } = problem;
    if (!datasetsById.has(problem.datasetId)) {
      return t`A dataset in this crosswalk couldn't be read, so it can't be part of the combined dataset. Check that it still exists and that you can open it.`;
    }
    if (problem.kind === "column_types_differ") {
      return t`${datasetName} was left out: a column it fills from holds a different kind of values than the same column of the first dataset with its layout. Remove it, or fix that column's type at its source.`;
    }
    return t`${datasetName} was left out: its columns changed since it was mapped. Remove it and add it again to map its new columns.`;
  };
}

function useProblemSentence(
  props: Readonly<Props>,
): (problem: CrosswalkProblem) => string {
  const { t } = useLingui();
  const toDatasetSentence = useDatasetProblemSentence(props.datasetsById);
  return (problem) => {
    switch (problem.kind) {
      case "columns_changed":
      case "column_types_differ":
        return toDatasetSentence(problem);
      case "invalid_expression": {
        const { columnName, layoutName } = _getNames(props, problem);
        return t`The formula that fills ${columnName} for ${layoutName} isn't a valid expression. Fix it in Map each dataset.`;
      }
      case "missing_code_list": {
        const { columnName, layoutName } = _getNames(props, problem);
        return t`${columnName} for ${layoutName} translates with a code list that was deleted, so its values come through unchanged.`;
      }
      case "nothing_to_combine":
        return t`There is nothing to combine yet. Map at least one dataset that isn't skipped.`;
      case "unconfirmed":
        return plural(problem.datasetCount, {
          one: "# dataset has mappings you haven't confirmed.",
          other: "# datasets have mappings you haven't confirmed.",
        });
      case "skipped":
        return plural(problem.datasetCount, {
          one: "# dataset is skipped.",
          other: "# datasets are skipped.",
        });
    }
  };
}

/**
 * The word a screen reader hears before a problem, since its icon is
 * decorative.
 */
function useWeightLabel(): (weight: ProblemWeight) => string {
  const { t } = useLingui();
  return (weight) => {
    switch (weight) {
      case "blocks":
        return t`Blocks:`;
      case "changes":
        return t`Changes:`;
      case "informs":
        return t`Note:`;
    }
  };
}

/**
 * Before you combine: everything the compile found, worst first. What
 * stops the save, what changes the data (a dataset left out, values passed
 * through), and what is only worth knowing (skipped and unconfirmed
 * datasets). The sort is stable, so problems of one weight keep the
 * compile's order. Nothing shows when there is nothing to say.
 */
export function CombineProblems(props: Readonly<Props>): ReactNode {
  const toSentence = useProblemSentence(props);
  const toWeightLabel = useWeightLabel();
  const headingId = useId();
  if (props.problems.length === 0) {
    return null;
  }
  const order: ProblemWeight[] = ["blocks", "changes", "informs"];
  const sorted = [...props.problems].sort((problemA, problemB) => {
    return (
      order.indexOf(_getWeight(problemA)) - order.indexOf(_getWeight(problemB))
    );
  });
  return (
    <section aria-labelledby={headingId}>
      <AppViewSection
        title={
          <span id={headingId}>
            <Trans>Before you combine</Trans>
          </span>
        }
      >
        <List spacing="xs" size="sm" listStyleType="none" center>
          {sorted.map((problem) => {
            return (
              <List.Item
                key={_toProblemKey(problem)}
                icon={<ProblemIcon weight={_getWeight(problem)} />}
              >
                <VisuallyHidden>
                  {toWeightLabel(_getWeight(problem))}{" "}
                </VisuallyHidden>
                {toSentence(problem)}
              </List.Item>
            );
          })}
        </List>
      </AppViewSection>
    </section>
  );
}

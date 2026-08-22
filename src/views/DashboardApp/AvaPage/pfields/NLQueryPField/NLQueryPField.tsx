import { Tabs } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PromptTabPanel } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/PromptTabPanel";
import { SqlTabPanel } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/SqlTabPanel";
import { useDashboardManualQueryState } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/useDashboardManualQueryState";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import { useNLPQuery } from "@/views/DataExplorerApp/QueryForm/useNLPQuery";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ReactElement } from "react";

export type NLQuery = {
  /**
   * The current prompt for the query. This may be different from the latest
   * generation if the user has edited the prompt since then.
   */
  prompt: string;

  /**
   * The raw SQL for the query. This may be different from the latest generation
   * if the user has edited the SQL since then.
   */
  rawSql: string;

  /**
   * An array of all previous generations of the query. This array is not user
   * editable, it serves as a history of every prompt & SQL generation so the
   * user can always revert to a previous generation if they want to.
   */
  generations: ReadonlyArray<
    | {
        prompt: string;
        rawSql: string;
        error?: undefined;
      }
    | {
        prompt: string;
        rawSql: undefined;
        error: string;
      }
  >;
};

type Props = AvaPageFieldProps<NLQuery>;

/** Edits a visualization query through prompt, structured, and SQL tabs. */
export function NLQueryPField({ value, onChange }: Props): ReactElement {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [generateAndRunQuery, isRunningQuery] = useNLPQuery({
    workspaceId: workspace.id,
    onSuccess: (sql, mutationVars) => {
      onChange({
        ...value,
        rawSql: sql,
        generations: [
          ...value.generations,
          {
            prompt: mutationVars.prompt,
            rawSql: sql,
          },
        ],
      });
    },
  });
  const { prompt, rawSql } = value;

  const manualState = useDashboardManualQueryState({
    rawSql,
    onRawSqlChange: (nextSql) => {
      onChange({ ...value, rawSql: nextSql });
    },
  });

  return (
    <Tabs
      indicatorVariant="floating"
      tabIds={["prompt", "manual-query", "sql"] as const}
      renderTabHeader={{
        prompt: t`Prompt`,
        "manual-query": t`Manual`,
        sql: t`SQL`,
      }}
      px="xs"
      py="sm"
      renderTabPanel={{
        prompt: () => {
          return (
            <PromptTabPanel
              prompt={prompt}
              isRunningQuery={isRunningQuery}
              onSubmitPrompt={(promptStr) => {
                onChange({ ...value, prompt: promptStr });
                if (promptStr) {
                  generateAndRunQuery({ prompt: promptStr });
                }
              }}
            />
          );
        },
        "manual-query": () => {
          if (!manualState.isParserReady) {
            return (
              <Text size="sm" c="dimmed" px="sm">
                <Trans>Loading datasets…</Trans>
              </Text>
            );
          }
          return (
            <ManualQueryForm
              query={manualState.query}
              isStructuredQueryInSync={manualState.isStructuredQueryInSync}
              handlers={manualState.handlers}
              withinPortal
            />
          );
        },
        sql: () => {
          return (
            <SqlTabPanel
              rawSql={rawSql}
              isStructuredQueryInSync={manualState.isStructuredQueryInSync}
              sqlSyncWarnings={manualState.sqlSyncWarnings}
              onSubmitSql={(nextSql) => {
                onChange({ ...value, rawSql: nextSql });
              }}
            />
          );
        },
      }}
    />
  );
}

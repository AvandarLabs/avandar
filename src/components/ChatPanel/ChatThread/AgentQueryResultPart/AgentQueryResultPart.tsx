import { useLingui } from "@lingui/react/macro";
import { Skeleton } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useId } from "react";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AGENT_QUERY_RESULT_DEFINITION } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/agentQueryResultDefinition";
import classes from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { GadgetCardHeader } from "@/components/RichText/Gadget/GadgetCard/GadgetCardHeader";
import chipClasses from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { AgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import type { GadgetLinkTarget } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

function _openLink(
  result: AgentQueryResultData,
  workspaceSlug: string,
): GadgetLinkTarget {
  const link = AppLinks.dataExplorer(workspaceSlug);
  return { to: link.to, params: link.params, search: { sql: result.sql } };
}

/**
 * The title a result shows. Stored titles are never empty, but one of only
 * spaces would leave the card unnamed, so it falls back to the type label.
 */
function useResultTitle(result: AgentQueryResultData): string {
  const { i18n } = useLingui();
  const title = result.title.trim();
  return title === "" ? i18n._(AGENT_QUERY_RESULT_DEFINITION.label) : title;
}

/** The card's body: the chart once the result is in, else its state. */
function ResultCardBody({ view }: { view: AgentQueryResultView }): ReactNode {
  const { t } = useLingui();
  if (view.status === "loading") {
    return <Skeleton h="100%" data-testid="agent-query-result-skeleton" />;
  }
  if (view.status === "unavailable") {
    return (
      <p className={cardClasses.unavailableText}>
        {t`This result could not be loaded.`}
      </p>
    );
  }
  return (
    <VisualizationContainer
      columns={view.columns}
      rawColumns={view.rawColumns}
      data={view.data}
      dateColumns={view.dateColumns}
      vizConfig={view.vizConfig}
    />
  );
}

function ResultCard({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  const view = useAgentQueryResultView(result, workspace.id);
  const title = useResultTitle(result);
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={view.status === "loading" ? true : undefined}
      className={clsx(cardClasses.card, classes.root)}
    >
      <GadgetCardHeader
        definition={AGENT_QUERY_RESULT_DEFINITION}
        summary={{
          status: "available",
          name: title,
          facts: [],
          link: _openLink(result, workspace.slug),
        }}
        titleId={titleId}
        menu={undefined}
      />
      <div className={classes.body}>
        <ResultCardBody view={view} />
      </div>
    </div>
  );
}

function ResultChip({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  const title = useResultTitle(result);
  return (
    <Link
      {..._openLink(result, workspace.slug)}
      className={clsx(chipClasses.chip, classes.root)}
    >
      <IconChartBar size={13} aria-hidden className={chipClasses.icon} />
      <span className={chipClasses.label}>{title}</span>
    </Link>
  );
}

/**
 * A query the agent ran for the user, inside an assistant message: an
 * embed card with the live chart or table and an Open link to the Data
 * Explorer, or an inline chip. Reuses the gadget card and chip, so results
 * read like the dashboards and datasets linked in comments. Rendered by
 * `AgentQueryResultPartLazy`, which loads this module on first use.
 */
export function AgentQueryResultPart({
  data,
}: DataMessagePartProps): ReactNode {
  const result = AgentQueryResult.parse(data);
  if (!result) {
    return null;
  }
  return result.display === "link" ? (
    <ResultChip result={result} />
  ) : (
    <ResultCard result={result} />
  );
}

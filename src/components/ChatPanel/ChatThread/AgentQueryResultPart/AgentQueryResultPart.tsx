import { msg } from "@lingui/core/macro";
import { IconChartBar } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import classes from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { GadgetCardHeader } from "@/components/RichText/Gadget/GadgetCard/GadgetCardHeader";
import chipClasses from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type {
  GadgetLinkTarget,
  GadgetSummary,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

/** The result card's header copy, in the gadget card's shape. */
const RESULT_DEFINITION = {
  Icon: IconChartBar,
  label: msg`Result`,
  loadingLabel: msg`Loading result`,
  unavailableLabel: msg`Unavailable result`,
};

function _openLink(
  result: AgentQueryResultData,
  workspaceSlug: string,
): GadgetLinkTarget {
  const link = AppLinks.dataExplorer(workspaceSlug);
  return { to: link.to, params: link.params, search: { sql: result.sql } };
}

function ResultCard({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  const view = useAgentQueryResultView(result, workspace.id);
  const titleId = useId();
  const summary: GadgetSummary =
    view.status === "ready"
      ? {
          status: "available",
          name: result.title,
          facts: [],
          link: _openLink(result, workspace.slug),
        }
      : { status: view.status };
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={view.status === "loading" ? true : undefined}
      className={cardClasses.card}
    >
      <GadgetCardHeader
        definition={RESULT_DEFINITION}
        summary={summary}
        titleId={titleId}
        menu={undefined}
      />
      {view.status === "ready" ? (
        <div className={classes.body}>
          <VisualizationContainer
            columns={view.columns}
            rawColumns={view.rawColumns}
            data={view.data}
            dateColumns={view.dateColumns}
            vizConfig={view.vizConfig}
          />
        </div>
      ) : null}
    </div>
  );
}

function ResultChip({ result }: { result: AgentQueryResultData }): ReactNode {
  const workspace = useCurrentWorkspace();
  return (
    <Link {..._openLink(result, workspace.slug)} className={chipClasses.chip}>
      <IconChartBar size={13} aria-hidden className={chipClasses.icon} />
      <span className={chipClasses.label}>{result.title}</span>
    </Link>
  );
}

/**
 * A query the agent ran for the user, inside an assistant message: an
 * embed card with the live chart or table and an Open link to the Data
 * Explorer, or an inline chip. Reuses the gadget card and chip, so results
 * read like the dashboards and datasets linked in comments. Rendered by
 * `MessagePrimitive.Parts` for `data` parts named
 * `AgentQueryResult.PART_NAME`.
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

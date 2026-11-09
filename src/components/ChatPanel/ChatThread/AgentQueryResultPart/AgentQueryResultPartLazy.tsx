import { Skeleton } from "@mantine/core";
import clsx from "clsx";
import { lazy, Suspense, useId } from "react";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AGENT_QUERY_RESULT_DEFINITION } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/agentQueryResultDefinition";
import classes from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart.module.css";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { GadgetCardHeader } from "@/components/RichText/Gadget/GadgetCard/GadgetCardHeader";
import chipClasses from "@/components/RichText/Gadget/GadgetChip/GadgetChip.module.css";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

const LazyAgentQueryResultPart = lazy(async () => {
  const module =
    await import("@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart");
  return { default: module.AgentQueryResultPart };
});

/**
 * Stands in for a result while its code loads: a card with the result
 * header and a body of the card's fixed height, or a chip-sized block, so
 * the message does not move when the result arrives.
 */
function ResultPlaceholder({
  result,
}: {
  result: AgentQueryResultData;
}): ReactNode {
  const titleId = useId();
  if (result.display === "link") {
    return (
      <Skeleton
        h="1.5em"
        w={120}
        display="inline-block"
        className={clsx(chipClasses.chip, classes.root)}
      />
    );
  }
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={true}
      className={clsx(cardClasses.card, classes.root)}
    >
      <GadgetCardHeader
        definition={AGENT_QUERY_RESULT_DEFINITION}
        summary={{ status: "loading" }}
        titleId={titleId}
        menu={undefined}
      />
      <div
        className={classes.body}
        data-testid="agent-query-result-placeholder-body"
      >
        <Skeleton h="100%" />
      </div>
    </div>
  );
}

/**
 * The chat's `data` part renderer for agent query results. The result card
 * draws charts, so its code (the chart libraries and the query hook) loads
 * the first time a result is shown, which keeps it out of the app shell's
 * bundle. A placeholder of the same size holds the result's place meanwhile.
 */
export function AgentQueryResultPartLazy(
  props: DataMessagePartProps,
): ReactNode {
  const result = AgentQueryResult.parse(props.data);
  if (!result) {
    return null;
  }
  return (
    <Suspense fallback={<ResultPlaceholder result={result} />}>
      <LazyAgentQueryResultPart {...props} />
    </Suspense>
  );
}

import { useLingui } from "@lingui/react/macro";
import { Skeleton, Text } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { clsx } from "clsx";
import { lazy, Suspense, useId } from "react";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import classes from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart.module.css";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

const LazyAgentDashboardBlockPart = lazy(async () => {
  const module =
    await import("@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart");
  return { default: module.AgentDashboardBlockPart };
});

/**
 * Stands in for a card while its code loads: the card's frame and title,
 * with a body block as tall as the preview will be (a chart's preview is
 * taller than a text block's), so the message does not move when the card
 * arrives.
 */
function CardPlaceholder({
  card,
}: {
  card: AgentDashboardBlockData;
}): ReactNode {
  const { t } = useLingui();
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      aria-busy={true}
      className={clsx(cardClasses.card, classes.root)}
    >
      <div className={cardClasses.header}>
        <span className={cardClasses.iconTile}>
          <IconLayoutDashboard aria-hidden size={16} />
        </span>
        <Text id={titleId} fw={600} size="sm">
          {t`Add to dashboard`}
        </Text>
      </div>
      <div
        className={clsx(
          classes.body,
          card.block.kind === "DataViz" && classes.preview,
        )}
        data-testid="agent-dashboard-block-placeholder-body"
      >
        <Skeleton h="100%" mih={48} />
      </div>
    </div>
  );
}

/**
 * The chat's `data` part renderer for the agent's dashboard cards. The card
 * draws charts, so its code (the chart libraries and the query hook) loads
 * the first time a card is shown, which keeps it out of the app shell's
 * bundle. A placeholder holds the card's place meanwhile.
 */
export function AgentDashboardBlockPartLazy(
  props: DataMessagePartProps,
): ReactNode {
  const card = AgentDashboardBlock.parse(props.data);
  if (!card) {
    return null;
  }
  return (
    <Suspense fallback={<CardPlaceholder card={card} />}>
      <LazyAgentDashboardBlockPart {...props} />
    </Suspense>
  );
}

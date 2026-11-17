import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Radio, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconLayoutDashboard } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useId, useState } from "react";
import {
  AgentDashboardCardStore,
  useAgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import classes from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlockPart.module.css";
import { confirmAgentDashboardCard } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/confirmAgentDashboardCard";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { AgentQueryResultBody } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResultPart";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import cardClasses from "@/components/RichText/Gadget/GadgetCard/GadgetCard.module.css";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type {
  AgentDashboardCardIdentity,
  AgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type { DataMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";

type CardBlock = AgentDashboardBlockData["block"];

/** What each kind of block is called to the user. */
const BLOCK_KIND_LABELS = {
  HeadingBlock: msg`Heading`,
  ParagraphBlock: msg`Paragraph`,
  QuoteBlock: msg`Quote`,
  DividerBlock: msg`Divider`,
  CalloutBlock: msg`Callout`,
  ListBlock: msg`List`,
  CodeBlock: msg`Code`,
  TableBlock: msg`Table`,
  Card: msg`Card`,
};

/** The text of a block worth showing in a preview, if it has any. */
function _blockPreviewText(
  block: Exclude<CardBlock, { kind: "DataViz" }>,
): string | undefined {
  switch (block.kind) {
    case "HeadingBlock":
    case "ParagraphBlock":
      return block.text;
    case "QuoteBlock":
      return block.quote;
    case "DividerBlock":
      return undefined;
    case "CalloutBlock":
      return `${block.title}: ${block.body}`;
    case "ListBlock":
      return block.items.join(", ");
    case "CodeBlock":
      return block.code;
    case "TableBlock":
      return block.data;
    case "Card":
      return block.title;
  }
}

/** The identity that scopes this card's status, once it is known. */
function useCardIdentity(): AgentDashboardCardIdentity | undefined {
  const workspace = useCurrentWorkspace();
  const userId = useCurrentUser()?.id;
  const sessionId = useChatSessions()?.index.selectedId;
  if (userId === undefined || !sessionId) {
    return undefined;
  }
  return { workspaceId: workspace.id, userId, sessionId };
}

/** A chart block's preview, drawn from its result as the result card is. */
function ChartPreview({
  block,
}: {
  block: Extract<CardBlock, { kind: "DataViz" }>;
}): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const view = useAgentQueryResultView(
    AgentQueryResult.create({
      sql: block.sql,
      chart: block.vizType,
      title: block.prompt,
    }),
    workspace.id,
  );
  const isEmpty = view.status === "ready" && view.data.length === 0;
  return (
    <div
      className={classes.preview}
      aria-busy={view.status === "loading" ? true : undefined}
    >
      {isEmpty ? (
        <Text size="sm" c="dimmed">
          {t`This chart has no rows yet.`}
        </Text>
      ) : (
        <AgentQueryResultBody view={view} />
      )}
    </div>
  );
}

/** A text block's preview: its kind, then its main text. */
function TextPreview({
  block,
}: {
  block: Exclude<CardBlock, { kind: "DataViz" }>;
}): ReactNode {
  const { i18n } = useLingui();
  const text = _blockPreviewText(block);
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {i18n._(BLOCK_KIND_LABELS[block.kind])}
      </Text>
      {text ? (
        <Text size="sm" lineClamp={4}>
          {text}
        </Text>
      ) : null}
    </Stack>
  );
}

/** What the card would add, as the dashboard would show it. */
function BlockPreview({ card }: { card: AgentDashboardBlockData }): ReactNode {
  return card.block.kind === "DataViz" ? (
    <ChartPreview block={card.block} />
  ) : (
    <TextPreview block={card.block} />
  );
}

/** One dashboard choice: its name, with chart count and last edit. */
function CandidateOption({
  candidate,
}: {
  candidate: AgentDashboardCandidate;
}): ReactNode {
  const { t, i18n } = useLingui();
  const { chartCount, updatedAt } = candidate;
  const updatedDate = updatedAt ? new Date(updatedAt) : undefined;
  const facts = [
    chartCount === undefined
      ? undefined
      : plural(chartCount, { one: "# chart", other: "# charts" }),
    updatedDate === undefined || Number.isNaN(updatedDate.getTime())
      ? undefined
      : t`edited ${i18n.date(updatedDate, { dateStyle: "medium" })}`,
  ].filter((fact) => {
    return fact !== undefined;
  });
  return (
    <Radio
      value={candidate.id}
      label={candidate.name}
      description={facts.length > 0 ? facts.join(" · ") : undefined}
    />
  );
}

/** Radio choices for a name that matches several dashboards. */
function DashboardPicker({
  candidates,
  value,
  onChange,
}: {
  candidates: readonly AgentDashboardCandidate[];
  value: string | undefined;
  onChange: (dashboardId: string) => void;
}): ReactNode {
  const { t } = useLingui();
  return (
    <Radio.Group
      value={value ?? null}
      onChange={onChange}
      label={t`Which dashboard?`}
    >
      <Stack gap="xs" mt="xs">
        {candidates.map((candidate) => {
          return <CandidateOption key={candidate.id} candidate={candidate} />;
        })}
      </Stack>
    </Radio.Group>
  );
}

/** The message a failed card shows, and whether trying again can help. */
function useFailureCopy(
  reason: Extract<AgentDashboardCardStatus, { status: "failed" }>["reason"],
): { message: string; canRetry: boolean } {
  const { t } = useLingui();
  switch (reason) {
    case "network":
      return {
        message: t`Couldn't save. Check your connection and try again.`,
        canRetry: true,
      };
    case "stale":
      return {
        message: t`The dashboard changed while saving. Try again.`,
        canRetry: true,
      };
    case "unavailable":
      return {
        message: t`This dashboard is no longer available.`,
        canRetry: false,
      };
  }
}

/** The link to a dashboard a card added its block to. */
function OpenDashboardLink({
  dashboardId,
  dashboardName,
}: {
  dashboardId: string;
  dashboardName: string;
}): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  return (
    <Link
      to="/$workspaceSlug/dashboards/edit/$dashboardId"
      params={{ workspaceSlug: workspace.slug, dashboardId }}
      className={cardClasses.openLink}
    >
      {t`Open ${dashboardName}`}
      <IconArrowRight size={13} aria-hidden className={cardClasses.openArrow} />
    </Link>
  );
}

/** A failed card: why, and Retry when trying again can help. */
function FailedStatus({
  reason,
  onRetry,
}: {
  reason: Extract<AgentDashboardCardStatus, { status: "failed" }>["reason"];
  onRetry: () => void;
}): ReactNode {
  const { t } = useLingui();
  const { message, canRetry } = useFailureCopy(reason);
  return (
    <Group gap="xs">
      <Text size="sm">{message}</Text>
      {canRetry ? (
        <Button variant="default" size="xs" onClick={onRetry}>
          {t`Retry`}
        </Button>
      ) : null}
    </Group>
  );
}

/** What happened to the card: added with a link, cancelled, or failed. */
function CardStatusView({
  status,
  onRetry,
}: {
  status: AgentDashboardCardStatus;
  onRetry: () => void;
}): ReactNode {
  const { t } = useLingui();
  if (status.status === "cancelled") {
    return <Text size="sm">{t`Nothing was added.`}</Text>;
  }
  if (status.status === "failed") {
    return <FailedStatus reason={status.reason} onRetry={onRetry} />;
  }
  return (
    <Group gap="xs">
      <Text size="sm">
        {status.isUnsaved
          ? t`It is in the open editor. Save the dashboard to keep it.`
          : t`Added to the dashboard.`}
      </Text>
      <OpenDashboardLink
        dashboardId={status.dashboardId}
        dashboardName={status.dashboardName}
      />
    </Group>
  );
}

/**
 * Confirms the card on the dashboard picked now. The editor's state is read
 * at render time, so the check sees the editor as the user clicks.
 */
function useConfirmCard(
  options: Readonly<{
    card: AgentDashboardBlockData;
    identity: AgentDashboardCardIdentity;
    dashboard: AgentDashboardCandidate | undefined;
  }>,
): { isBusy: boolean; confirm: () => Promise<void> } {
  const { card, identity, dashboard } = options;
  const editorState = DashboardEditorStateManager.useState();
  const dispatch = DashboardEditorStateManager.useDispatch();
  const [isBusy, setIsBusy] = useState(false);
  const confirm = async (): Promise<void> => {
    if (dashboard === undefined) {
      return;
    }
    setIsBusy(true);
    try {
      await confirmAgentDashboardCard({
        card,
        dashboard,
        identity,
        editor: { activeDashboardId: editorState.activeDashboardId, dispatch },
      });
    } finally {
      setIsBusy(false);
    }
  };
  return { isBusy, confirm };
}

/** The one dashboard the block goes to, or a picker among several. */
function DashboardChoice({
  candidates,
  pickedId,
  onPick,
}: {
  candidates: readonly AgentDashboardCandidate[];
  pickedId: string | undefined;
  onPick: (dashboardId: string) => void;
}): ReactNode {
  if (candidates.length === 1) {
    return (
      <Text size="sm" fw={500}>
        {candidates[0]!.name}
      </Text>
    );
  }
  return (
    <DashboardPicker
      candidates={candidates}
      value={pickedId}
      onChange={onPick}
    />
  );
}

/** The target dashboard or a picker, then Confirm and Cancel. */
function PendingActions({
  card,
  identity,
}: {
  card: AgentDashboardBlockData;
  identity: AgentDashboardCardIdentity;
}): ReactNode {
  const { t } = useLingui();
  const [pickedId, setPickedId] = useState<string | undefined>(
    card.candidates.length === 1 ? card.candidates[0]!.id : undefined,
  );
  const dashboard = card.candidates.find((candidate) => {
    return candidate.id === pickedId;
  });
  const { isBusy, confirm } = useConfirmCard({ card, identity, dashboard });
  const cancel = (): void => {
    AgentDashboardCardStore.setStatus(identity, card.cardId, {
      status: "cancelled",
      isReported: false,
    });
  };
  return (
    <Stack gap="sm">
      <DashboardChoice
        candidates={card.candidates}
        pickedId={pickedId}
        onPick={setPickedId}
      />
      <Group gap="xs">
        <Button
          size="xs"
          onClick={() => {
            void confirm();
          }}
          disabled={dashboard === undefined}
          loading={isBusy}
        >
          {t`Confirm`}
        </Button>
        <Button variant="subtle" size="xs" onClick={cancel} disabled={isBusy}>
          {t`Cancel`}
        </Button>
      </Group>
    </Stack>
  );
}

/**
 * The agent's proposal to add one block to a dashboard, inside an
 * assistant message: a preview of the block, the dashboard it goes to (or
 * a picker), and Confirm and Cancel. Confirming saves the block with no
 * model call. What the user did is kept in `AgentDashboardCardStore`, so
 * the card shows its outcome after a reload and the agent hears of it on
 * the next turn.
 */
export function AgentDashboardBlockPart({
  data,
}: DataMessagePartProps): ReactNode {
  const { t } = useLingui();
  const titleId = useId();
  const identity = useCardIdentity();
  const card = AgentDashboardBlock.parse(data);
  const status = useAgentDashboardCardStatus(identity, card?.cardId ?? "");
  if (!card) {
    return null;
  }
  const retry = (): void => {
    if (identity) {
      AgentDashboardCardStore.clearStatus(identity, card.cardId);
    }
  };
  return (
    <div
      role="group"
      aria-labelledby={titleId}
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
      <Stack gap="sm" className={classes.body}>
        <BlockPreview card={card} />
        <div role="status">
          {status === undefined ? null : (
            <CardStatusView status={status} onRetry={retry} />
          )}
        </div>
        {status === undefined && identity ? (
          <PendingActions card={card} identity={identity} />
        ) : null}
      </Stack>
    </div>
  );
}

import { z } from "zod";
import { parseDashboardBlockFields } from "$/agent/dashboardBlocks/DashboardBlockFields";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";

const CandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  chartCount: z.number().int().nonnegative().optional(),
  updatedAt: z.string().optional(),
});

const AgentDashboardBlockSchema = z.object({
  version: z.literal(1),
  cardId: z.string().min(1),
  block: z.unknown(),
  candidates: z.array(CandidateSchema).min(1),
});

/**
 * A block the agent proposed for a dashboard that is not open in the
 * editor, as the chat thread stores it. Its status (confirmed, cancelled,
 * failed) is kept in `AgentDashboardCardStore`, since a stored message
 * part never changes.
 */
export type AgentDashboardBlockData = Omit<
  z.infer<typeof AgentDashboardBlockSchema>,
  "block" | "candidates"
> & {
  block: ChatGeneratedDashboardBlock;
  candidates: readonly AgentDashboardCandidate[];
};

/** The assistant-ui `data` part name the chat renders cards by. */
const PART_NAME = "agent-dashboard-block";

/** Creates, stores, and reads the agent's dashboard cards in the chat. */
export const AgentDashboardBlock = {
  PART_NAME,

  /** A new card with its own id. */
  create: (
    options: Readonly<{
      block: ChatGeneratedDashboardBlock;
      candidates: readonly AgentDashboardCandidate[];
    }>,
  ): AgentDashboardBlockData => {
    return { version: 1, cardId: crypto.randomUUID(), ...options };
  },

  /** The message part that carries a card in an assistant reply. */
  toDataPart: (
    card: AgentDashboardBlockData,
  ): { type: "data"; name: string; data: AgentDashboardBlockData } => {
    return { type: "data", name: PART_NAME, data: card };
  },

  /** Reads stored data, or undefined when it is not a valid card. */
  parse: (value: unknown): AgentDashboardBlockData | undefined => {
    const parsed = AgentDashboardBlockSchema.safeParse(value);
    if (!parsed.success) {
      return undefined;
    }
    const block = parseDashboardBlockFields(parsed.data.block);
    return block.kind === "valid"
      ? { ...parsed.data, block: block.block }
      : undefined;
  },
};

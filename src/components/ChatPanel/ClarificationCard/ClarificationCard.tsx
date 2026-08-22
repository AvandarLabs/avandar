import type { ChatClarifyRequest } from "$/types/chat.types";
import type { ClarificationAnswerHandler } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

import { Paper, Stack } from "@mantine/core";

import css from "./ClarificationCard.module.css";
import { ClarificationCardBody } from "./ClarificationCardBody";
import { ClarificationCardHeader } from "./ClarificationCardHeader";

export type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  request: ChatClarifyRequest;
  onAnswer: ClarificationAnswerHandler;
  resolveDiscovery?: DiscoveryResolver;
  onRequestDifferentDiscovery?: () => void;
};

/** Renders an inline clarification request in the chat thread. */
export function ClarificationCard({
  request,
  onAnswer,
  resolveDiscovery,
  onRequestDifferentDiscovery,
}: Readonly<Props>): React.ReactNode {
  const { question, rationale, responseShape, turnNumber } = request;
  const header = (
    <ClarificationCardHeader
      question={question}
      rationale={rationale}
      turnNumber={turnNumber}
    />
  );
  const body = (
    <ClarificationCardBody
      responseShape={responseShape}
      onAnswer={onAnswer}
      resolveDiscovery={resolveDiscovery}
      onRequestDifferentDiscovery={onRequestDifferentDiscovery}
      discoveryHeader={header}
    />
  );

  return (
    <Paper withBorder shadow="xs" radius="md" p="md" bg="blue.0">
      <Stack gap="sm">
        {responseShape.kind === "discovery" ? (
          body
        ) : (
          <>
            {header}
            <div
              className={css.clarificationCardBody}
              data-testid="clarification-card-body"
            >
              {body}
            </div>
          </>
        )}
      </Stack>
    </Paper>
  );
}

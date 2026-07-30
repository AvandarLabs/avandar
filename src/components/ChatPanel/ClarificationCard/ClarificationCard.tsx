import { Paper, Stack } from "@mantine/core";
import { ClarificationCardBody } from "./ClarificationCardBody";
import { ClarificationCardHeader } from "./ClarificationCardHeader";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";
import type { ChatClarifyRequest } from "$/types/chat.types";

export type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  request: ChatClarifyRequest;
  onAnswer: (answer: ClarificationSubmitAnswer) => void;
  resolveDiscovery?: DiscoveryResolver;
};

/** Renders an inline clarification request in the chat thread. */
export function ClarificationCard({
  request,
  onAnswer,
  resolveDiscovery,
}: Readonly<Props>): React.ReactNode {
  const { question, rationale, responseShape, turnNumber } = request;

  return (
    <Paper withBorder shadow="xs" radius="md" p="md" bg="blue.0">
      <Stack gap="sm">
        <ClarificationCardHeader
          question={question}
          rationale={rationale}
          turnNumber={turnNumber}
        />
        <ClarificationCardBody
          responseShape={responseShape}
          onAnswer={onAnswer}
          resolveDiscovery={resolveDiscovery}
        />
      </Stack>
    </Paper>
  );
}

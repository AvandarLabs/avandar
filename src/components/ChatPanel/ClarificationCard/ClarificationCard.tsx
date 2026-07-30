import { Trans } from "@lingui/react/macro";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";
import { DiscoveryBody } from "./DiscoveryBody";
import { FixedOptionsBody } from "./FixedOptionsBody";
import { FreeTextBody } from "./FreeTextBody";
import type { ClarificationSubmitAnswer } from "./clarificationAnswer/clarificationAnswer";
import type { ChatClarifyRequest } from "$/types/chat.types";

export type { ClarificationSubmitAnswer } from "./clarificationAnswer/clarificationAnswer";

/** Resolves discovery queries to concrete column values (or an error). */
export type DiscoveryResolver = (args: {
  query: string;
  column: string;
}) => Promise<{ values: string[] } | { error: string }>;

export type Props = {
  request: ChatClarifyRequest;
  onAnswer: (answer: ClarificationSubmitAnswer) => void;
  resolveDiscovery?: DiscoveryResolver;
};

/**
 * Inline clarification UI rendered in the chat thread (not modal).
 *
 *   - free_text:           Textarea + "Send answer"
 *   - fixed_options multi: checkbox group + "Something else" /
 *     "None of the above"
 *   - fixed_options single: radio group + custom text + "None of the above"
 */
export function ClarificationCard({
  request,
  onAnswer,
  resolveDiscovery,
}: Props): React.ReactNode {
  const { question, rationale, responseShape, turnNumber } = request;

  return (
    <Paper withBorder shadow="xs" radius="md" p="md" bg="blue.0">
      <Stack gap="sm">
        <Group gap="xs" align="flex-start">
          <IconHelp
            size={16}
            color="var(--mantine-color-blue-6)"
            style={{ marginTop: 2 }}
          />
          <Stack gap={2} style={{ flex: 1 }}>
            <Text size="sm" fw={600}>
              {question}
            </Text>
            {rationale ?
              <Text size="xs" c="dimmed">
                {rationale}
              </Text>
            : null}
            <Text size="xs" c="dimmed">
              <Trans>Clarification {turnNumber} of 3</Trans>
            </Text>
          </Stack>
        </Group>

        {(() => {
          if (responseShape.kind === "free_text") {
            return (
              <FreeTextBody
                placeholder={responseShape.placeholder}
                onSubmit={(text) => {
                  return onAnswer({ kind: "custom", text });
                }}
              />
            );
          }
          if (responseShape.kind === "fixed_options") {
            return (
              <FixedOptionsBody
                options={responseShape.options}
                multi={responseShape.multi}
                onSubmit={onAnswer}
              />
            );
          }
          return (
            <DiscoveryBody
              query={responseShape.query}
              column={responseShape.column}
              multi={responseShape.multi}
              resolveDiscovery={resolveDiscovery}
              onSubmit={onAnswer}
            />
          );
        })()}
      </Stack>
    </Paper>
  );
}

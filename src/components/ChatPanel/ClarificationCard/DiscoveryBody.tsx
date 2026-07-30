import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Code, Group, Loader, Stack, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { DiscoveryCustomFallback } from "./DiscoveryCustomFallback";
import { FixedOptionsBody } from "./FixedOptionsBody";
import type { ClarificationSubmitAnswer } from "./clarificationAnswer/clarificationAnswer";
import type { DiscoveryResolver } from "./ClarificationCard";

type DiscoveryState =
  | { kind: "loading" }
  | { kind: "ready"; values: string[] }
  | { kind: "error"; error: string }
  | { kind: "empty" };

export type DiscoveryBodyProps = {
  query: string;
  column: string;
  multi: boolean;
  resolveDiscovery: DiscoveryResolver | undefined;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Resolves a generated discovery query and presents its values as options. */
export function DiscoveryBody({
  query,
  column,
  multi,
  resolveDiscovery,
  onSubmit,
}: DiscoveryBodyProps): React.ReactNode {
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({
    kind: "loading",
  });
  const { t } = useLingui();

  useEffect(
    function resolveDiscoveryValues() {
      let cancelled = false;
      async function run(): Promise<void> {
        if (!resolveDiscovery) {
          setDiscoveryState({
            kind: "error",
            error: t`Discovery is not available in this context.`,
          });
          return;
        }
        try {
          const result = await resolveDiscovery({ query, column });
          if (cancelled) return;
          if ("error" in result)
            setDiscoveryState({ kind: "error", error: result.error });
          else if (result.values.length === 0)
            setDiscoveryState({ kind: "empty" });
          else setDiscoveryState({ kind: "ready", values: result.values });
        } catch (error) {
          if (!cancelled) {
            setDiscoveryState({
              kind: "error",
              error: error instanceof Error ? error.message : t`Query failed.`,
            });
          }
        }
      }
      void run();
      return () => {
        cancelled = true;
      };
    },
    [query, column, resolveDiscovery, t],
  );

  const queryPreview = query.length > 200 ? `${query.slice(0, 200)}…` : query;
  if (discoveryState.kind === "loading")
    return (
      <Group gap="xs">
        <Loader size="xs" />
        <Text size="xs" c="dimmed">
          <Trans>Looking up values in {column}…</Trans>
        </Text>
      </Group>
    );
  if (discoveryState.kind === "error" || discoveryState.kind === "empty") {
    return (
      <Stack gap="xs">
        {discoveryState.kind === "error" ?
          <Alert
            icon={<IconAlertCircle size={14} />}
            color="red"
            variant="light"
            radius="sm"
            p="xs"
          >
            <Text size="xs">{discoveryState.error}</Text>
            <Code block fz="xs" mt={4}>
              {queryPreview}
            </Code>
          </Alert>
        : <Text size="xs" c="dimmed">
            <Trans>
              No values were returned from {column}. Describe what you need
              instead.
            </Trans>
          </Text>
        }
        <DiscoveryCustomFallback onSubmit={onSubmit} />
      </Stack>
    );
  }
  return (
    <FixedOptionsBody
      options={discoveryState.values}
      multi={multi}
      onSubmit={onSubmit}
    />
  );
}

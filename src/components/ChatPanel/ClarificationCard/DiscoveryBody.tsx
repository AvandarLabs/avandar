import { Trans } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import { match } from "ts-pattern";
import { DiscoveryUnavailableBody } from "./DiscoveryUnavailableBody";
import { FixedOptionsBody } from "./FixedOptionsBody";
import { useDiscoveryOptions } from "./useDiscoveryOptions";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

type Props = {
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
}: Readonly<Props>): React.ReactNode {
  const discoveryState = useDiscoveryOptions({
    query,
    column,
    resolveDiscovery,
  });
  const queryPreview = query.length > 200 ? `${query.slice(0, 200)}…` : query;
  return match(discoveryState)
    .with({ kind: "loading" }, () => {
      return (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            <Trans>Looking up values in {column}…</Trans>
          </Text>
        </Group>
      );
    })
    .with({ kind: "error" }, ({ error }) => {
      return (
        <DiscoveryUnavailableBody
          column={column}
          error={error}
          queryPreview={queryPreview}
          onSubmit={onSubmit}
        />
      );
    })
    .with({ kind: "empty" }, () => {
      return (
        <DiscoveryUnavailableBody
          column={column}
          queryPreview={queryPreview}
          onSubmit={onSubmit}
        />
      );
    })
    .with({ kind: "ready" }, ({ values }) => {
      return (
        <FixedOptionsBody options={values} multi={multi} onSubmit={onSubmit} />
      );
    })
    .exhaustive();
}

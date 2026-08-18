import { useCallback } from "react";
import { useDiscoveryOptions } from "../useDiscoveryOptions/useDiscoveryOptions";
import { DiscoveryStateBody } from "./DiscoveryStateBody/DiscoveryStateBody";
import type { ClarificationAnswerHandler } from "../ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

type Props = {
  header: React.ReactNode;
  query: string;
  column: string;
  multi: boolean;
  candidateValues: readonly string[];
  resolveDiscovery: DiscoveryResolver | undefined;
  onRequestDifferentDiscovery?: () => void;
  onSubmit: ClarificationAnswerHandler;
};

/** Resolves a generated discovery query and presents its values as options. */
export function DiscoveryBody({
  header,
  query,
  column,
  multi,
  candidateValues,
  resolveDiscovery,
  onRequestDifferentDiscovery,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const onUniqueMatch = useCallback(
    (storedValue: string) => {
      return onSubmit({
        answer: { kind: "preset", value: storedValue },
        isInternalDiscovery: true,
      });
    },
    [onSubmit],
  );
  const discoveryState = useDiscoveryOptions({
    query,
    column,
    resolveDiscovery,
    candidateValues,
    multi,
    onUniqueMatch,
  });
  const queryPreview = query.length > 200 ? `${query.slice(0, 200)}…` : query;
  return (
    <DiscoveryStateBody
      discoveryState={discoveryState}
      header={header}
      column={column}
      multi={multi}
      queryPreview={queryPreview}
      onRequestDifferentDiscovery={onRequestDifferentDiscovery}
      onSubmit={onSubmit}
    />
  );
}

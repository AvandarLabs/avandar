import { match } from "ts-pattern";
import { DiscoveryBody } from "./DiscoveryBody/DiscoveryBody";
import { FixedOptionsBody } from "./FixedOptionsBody";
import { FreeTextBody } from "./FreeTextBody";
import type { ChatClarifyResponseShape } from "$/types/chat.types";
import type { ClarificationAnswerHandler } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

type Props = {
  responseShape: ChatClarifyResponseShape;
  onAnswer: ClarificationAnswerHandler;
  resolveDiscovery?: DiscoveryResolver;
  onRequestDifferentDiscovery?: () => void;
  discoveryHeader?: React.ReactNode;
};

/** Renders the input control required by a clarification response shape. */
export function ClarificationCardBody({
  responseShape,
  onAnswer,
  resolveDiscovery,
  onRequestDifferentDiscovery,
  discoveryHeader,
}: Readonly<Props>): React.ReactNode {
  return match(responseShape)
    .with({ kind: "free_text" }, ({ placeholder }) => {
      return (
        <FreeTextBody
          placeholder={placeholder}
          onSubmit={(text) => {
            return onAnswer({ answer: { kind: "custom", text } });
          }}
        />
      );
    })
    .with({ kind: "fixed_options" }, ({ options, multi }) => {
      return (
        <FixedOptionsBody
          options={options}
          multi={multi}
          onSubmit={(answer) => {
            return onAnswer({ answer });
          }}
        />
      );
    })
    .with(
      { kind: "discovery" },
      ({ query, column, multi, candidateValues }) => {
        return (
          <DiscoveryBody
            header={discoveryHeader}
            query={query}
            column={column}
            multi={multi}
            candidateValues={candidateValues}
            resolveDiscovery={resolveDiscovery}
            onRequestDifferentDiscovery={onRequestDifferentDiscovery}
            onSubmit={onAnswer}
          />
        );
      },
    )
    .exhaustive();
}

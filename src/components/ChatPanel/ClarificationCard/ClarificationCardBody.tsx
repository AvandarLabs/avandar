import { match } from "ts-pattern";
import { DiscoveryBody } from "./DiscoveryBody";
import { FixedOptionsBody } from "./FixedOptionsBody";
import { FreeTextBody } from "./FreeTextBody";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";
import type { ChatClarifyResponseShape } from "$/types/chat.types";

type Props = {
  responseShape: ChatClarifyResponseShape;
  onAnswer: (answer: ClarificationSubmitAnswer) => void;
  resolveDiscovery?: DiscoveryResolver;
};

/** Renders the input control required by a clarification response shape. */
export function ClarificationCardBody({
  responseShape,
  onAnswer,
  resolveDiscovery,
}: Readonly<Props>): React.ReactNode {
  return match(responseShape)
    .with({ kind: "free_text" }, ({ placeholder }) => {
      return (
        <FreeTextBody
          placeholder={placeholder}
          onSubmit={(text) => {
            return onAnswer({ kind: "custom", text });
          }}
        />
      );
    })
    .with({ kind: "fixed_options" }, ({ options, multi }) => {
      return (
        <FixedOptionsBody options={options} multi={multi} onSubmit={onAnswer} />
      );
    })
    .with({ kind: "discovery" }, ({ query, column, multi }) => {
      return (
        <DiscoveryBody
          query={query}
          column={column}
          multi={multi}
          resolveDiscovery={resolveDiscovery}
          onSubmit={onAnswer}
        />
      );
    })
    .exhaustive();
}

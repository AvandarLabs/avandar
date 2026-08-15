import { match } from "ts-pattern";
import css from "./DiscoveryStateBody.module.css";
import { DiscoveryUnavailableBody } from "../../DiscoveryUnavailableBody/DiscoveryUnavailableBody";
import { FixedOptionsBody } from "../../FixedOptionsBody";
import { DiscoveryLoadingBody } from "../DiscoveryLoadingBody";
import type {
  ClarificationAnswerHandler,
  ClarificationSubmitAnswer,
} from "../../ClarificationAnswerModule/ClarificationAnswer";
import type { DiscoveryResolution } from "../../useDiscoveryOptions/useDiscoveryOptions";

type Props = {
  discoveryState: DiscoveryResolution;
  header: React.ReactNode;
  column: string;
  multi: boolean;
  queryPreview: string;
  onRequestDifferentDiscovery?: () => void;
  onSubmit: ClarificationAnswerHandler;
};

function _buildBodyFromDiscoveryResolution(
  options: Readonly<Omit<Props, "header">>,
): React.ReactNode {
  const onSubmitAnswer = (answer: Readonly<ClarificationSubmitAnswer>) => {
    return options.onSubmit({ answer });
  };
  return match(options.discoveryState)
    .with({ kind: "loading" }, () => {
      return <DiscoveryLoadingBody />;
    })
    .with({ kind: "ready" }, ({ values }) => {
      return (
        <FixedOptionsBody
          options={values}
          multi={options.multi}
          onSubmit={onSubmitAnswer}
        />
      );
    })
    .with({ kind: "error" }, ({ error, retry }) => {
      return (
        <DiscoveryUnavailableBody
          column={options.column}
          error={error}
          queryPreview={options.queryPreview}
          onRetry={retry}
          onRequestDifferentDiscovery={options.onRequestDifferentDiscovery}
          onSubmit={onSubmitAnswer}
        />
      );
    })
    .with({ kind: "empty" }, () => {
      return (
        <DiscoveryUnavailableBody
          column={options.column}
          queryPreview={options.queryPreview}
          onSubmit={onSubmitAnswer}
        />
      );
    })
    .exhaustive();
}

/** Renders the current discovery resolution state. */
export function DiscoveryStateBody({
  discoveryState,
  header,
  column,
  multi,
  queryPreview,
  onRequestDifferentDiscovery,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  const body = _buildBodyFromDiscoveryResolution({
    discoveryState,
    column,
    multi,
    queryPreview,
    onRequestDifferentDiscovery,
    onSubmit,
  });

  return (
    <>
      {discoveryState.kind !== "loading" ? header : null}
      <div
        className={css.discoveryStateBodyScrollArea}
        data-testid="clarification-card-body"
      >
        {body}
      </div>
    </>
  );
}

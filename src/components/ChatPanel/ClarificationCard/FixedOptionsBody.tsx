import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

import { MultiOptionBody } from "./MultiOptionBody";
import { SingleOptionBody } from "./SingleOptionBody";

type Props = {
  options: readonly string[];
  multi: boolean;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Collects a single- or multi-select clarification answer. */
export function FixedOptionsBody({
  options,
  multi,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  return multi ? (
    <MultiOptionBody options={options} onSubmit={onSubmit} />
  ) : (
    <SingleOptionBody options={options} onSubmit={onSubmit} />
  );
}

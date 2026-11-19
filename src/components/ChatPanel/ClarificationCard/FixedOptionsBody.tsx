import { MultiOptionBody } from "./MultiOptionBody";
import { SingleOptionBody } from "./SingleOptionBody";
import type { ClarificationSubmitAnswer } from "./ClarificationAnswerModule/ClarificationAnswer";

type Props = {
  options: readonly string[];
  /** What to show for each option, when it is not the option itself. */
  optionLabels?: readonly string[];
  multi: boolean;
  onSubmit: (answer: ClarificationSubmitAnswer) => void;
};

/** Collects a single- or multi-select clarification answer. */
export function FixedOptionsBody({
  options,
  optionLabels,
  multi,
  onSubmit,
}: Readonly<Props>): React.ReactNode {
  return multi ? (
    <MultiOptionBody
      options={options}
      optionLabels={optionLabels}
      onSubmit={onSubmit}
    />
  ) : (
    <SingleOptionBody
      options={options}
      optionLabels={optionLabels}
      onSubmit={onSubmit}
    />
  );
}

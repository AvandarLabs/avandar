import { Title, VisuallyHidden } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useNewDictionaryStepLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryStepLabels";
import type { NewDictionaryStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ReactNode } from "react";

type Props = {
  step: NewDictionaryStep;
};

/**
 * The current step's name as a heading no one needs to see, since the step
 * bar shows it. When the step changes, focus moves here so keyboard and
 * screen reader users land at the top of the new step, not on a button that
 * is gone. It does not take focus when the flow first opens.
 */
export function NewDictionaryStepHeading({ step }: Readonly<Props>): ReactNode {
  const labels = useNewDictionaryStepLabels();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(step);
  useEffect(() => {
    if (previousStepRef.current !== step) {
      previousStepRef.current = step;
      headingRef.current?.focus();
    }
  }, [step]);

  return (
    <VisuallyHidden>
      <Title order={2} tabIndex={-1} ref={headingRef}>
        {labels[step]}
      </Title>
    </VisuallyHidden>
  );
}

import { Title, VisuallyHidden } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { ApplyStep } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ReactNode } from "react";

type Props = {
  step: ApplyStep;
  labels: Record<ApplyStep, string>;
};

/**
 * The current step's name as a heading only assistive tech reads, since
 * the step bar shows it. Focus moves here when the step changes, so a
 * keyboard user lands at the top of the new step. It does not take focus
 * when the flow opens.
 */
export function ApplyDictionariesStepHeading({
  step,
  labels,
}: Readonly<Props>): ReactNode {
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

import { Title, VisuallyHidden } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { CrosswalkStep } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { ReactNode } from "react";

type Props = {
  step: CrosswalkStep;
  labels: Record<CrosswalkStep, string>;
};

/**
 * The current step's name as a heading no one needs to see, since the step
 * bar shows it. When the step changes, focus moves here so keyboard and
 * screen reader users land at the top of the new step. It does not take
 * focus when the view first opens.
 */
export function CrosswalkStepHeading({
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

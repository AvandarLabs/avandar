import { Title } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

/**
 * The heading of one install wizard page. It takes focus when the page
 * opens, so a keyboard or screen reader user lands on the new page's title
 * after pressing Next or Back instead of on a button that has moved. Every
 * step of `PluginInstallWizard` starts with one.
 */
export function InstallWizardStepHeading({ children }: Props): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    // Order 3 nests the step under the modal's order 2 title. The modal's
    // focus trap also lands here first, because of `data-autofocus`.
    <Title ref={headingRef} order={3} size="h5" tabIndex={-1} data-autofocus>
      {children}
    </Title>
  );
}

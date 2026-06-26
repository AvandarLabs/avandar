import { useContext } from "react";
import { TestProviders } from "../TestProviders";
import { ExtraWrapperContext } from "./ExtraWrapperContext";
import type { ReactNode } from "react";

/**
 * Thin wrapper component to receive additional wrappers from
 * a parent. We cannot use a prop because React Testing Library
 * only accepts a single `wrapper` component with a `children`
 * prop. So we consume any ExtraWrappers using context, and
 * then place those inside the always-required `TestProviders`.
 */
export function RenderWithWrappers({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const ExtraWrapper = useContext(ExtraWrapperContext);
  const childrenToRender =
    ExtraWrapper ? <ExtraWrapper>{children}</ExtraWrapper> : children;
  return <TestProviders>{childrenToRender}</TestProviders>;
}

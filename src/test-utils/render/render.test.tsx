import { screen } from "@testing-library/react";
import { createContext, useContext } from "react";
import { describe, expect, it } from "vitest";
import { render } from "./render";
import type { ReactNode } from "react";

const ProbeContext = createContext("default");

function Probe(): JSX.Element {
  return <div>value: {useContext(ProbeContext)}</div>;
}

describe("test-utils render", () => {
  it("mounts a custom `wrapper` as an ancestor of the rendered UI", () => {
    // Regression guard: a previous implementation threaded the custom
    // wrapper through React context, but the Provider ended up a
    // descendant of its consumer, so the wrapper was silently dropped.
    function ProbeProvider({ children }: { children: ReactNode }): JSX.Element {
      return (
        <ProbeContext.Provider value="from-wrapper">
          {children}
        </ProbeContext.Provider>
      );
    }

    render(<Probe />, { wrapper: ProbeProvider });

    expect(screen.getByText("value: from-wrapper")).toBeInTheDocument();
  });

  it("renders without a custom wrapper", () => {
    render(<Probe />);
    expect(screen.getByText("value: default")).toBeInTheDocument();
  });
});

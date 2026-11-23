import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "./Callout";

function renderCallout(ui: JSX.Element) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("Callout", () => {
  it("titles itself with an h2 by default", () => {
    renderCallout(<Callout title="Something failed" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Something failed" }),
    ).toBeInTheDocument();
  });

  it("titles itself at the heading level it is given", () => {
    renderCallout(<Callout title="Something failed" titleOrder={5} />);

    expect(
      screen.getByRole("heading", { level: 5, name: "Something failed" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
});

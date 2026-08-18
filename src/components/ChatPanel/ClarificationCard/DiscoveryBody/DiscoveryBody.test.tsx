/** Behavioral tests for automatic discovery candidate resolution. */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { DiscoveryBody } from "./DiscoveryBody";
import type { ComponentProps } from "react";

vi.mock("../DiscoveryUnavailableBody/DiscoveryCustomFallback", () => {
  return {
    DiscoveryCustomFallback: () => {
      return <div>Manual fallback</div>;
    },
  };
});

const DISCOVERY_PROPS = {
  query: 'SELECT DISTINCT "state" FROM "mortality"',
  column: "state",
  multi: false,
  header: <h2>Which stored state represents California?</h2>,
} satisfies Pick<
  ComponentProps<typeof DiscoveryBody>,
  "query" | "column" | "multi" | "header"
>;

describe("DiscoveryBody", () => {
  it("shows neutral progress without exposing the question while loading", () => {
    const pendingResult = new Promise<{ values: string[] }>(() => {
      return undefined;
    });
    render(
      <DiscoveryBody
        {...DISCOVERY_PROPS}
        candidateValues={["California", "CA"]}
        resolveDiscovery={vi.fn().mockReturnValue(pendingResult)}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Checking your data…")).toBeVisible();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.queryByText("Which stored state represents California?"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/California/)).not.toBeInTheDocument();
    expect(screen.queryByText(/state/i)).not.toBeInTheDocument();
  });

  it("submits one uniquely matched stored value without showing the catalog", async () => {
    const onSubmit = vi.fn();
    render(
      <DiscoveryBody
        {...DISCOVERY_PROPS}
        candidateValues={["california", "CA"]}
        resolveDiscovery={vi.fn().mockResolvedValue({
          values: ["Alabama", "California", "Nevada"],
        })}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        answer: { kind: "preset", value: "California" },
        isInternalDiscovery: true,
      });
    });
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the catalog when more than one stored value matches", async () => {
    const onSubmit = vi.fn();
    render(
      <DiscoveryBody
        {...DISCOVERY_PROPS}
        candidateValues={["California", "CA"]}
        resolveDiscovery={vi.fn().mockResolvedValue({
          values: ["California", "CA"],
        })}
        onSubmit={onSubmit}
      />,
    );

    expect(
      await screen.findByRole("radio", { name: /^California$/ }),
    ).toBeVisible();
    expect(
      screen.getByText("Which stored state represents California?"),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: /^CA$/ })).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the catalog when automatic submission is declined", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <DiscoveryBody
        {...DISCOVERY_PROPS}
        candidateValues={["California", "CA"]}
        resolveDiscovery={vi.fn().mockResolvedValue({
          values: ["Alabama", "California", "Nevada"],
        })}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        answer: { kind: "preset", value: "California" },
        isInternalDiscovery: true,
      });
    });
    expect(
      await screen.findByRole("radio", { name: /^California$/ }),
    ).toBeVisible();
    expect(
      screen.getByText("Which stored state represents California?"),
    ).toBeVisible();
  });

  it("offers recovery after three failures and can retry three more times", async () => {
    const resolveDiscovery = vi
      .fn()
      .mockResolvedValue({ error: "catalog unavailable" });
    const onRequestDifferentDiscovery = vi.fn();
    render(
      <DiscoveryBody
        {...DISCOVERY_PROPS}
        candidateValues={["California", "CA"]}
        resolveDiscovery={resolveDiscovery}
        onRequestDifferentDiscovery={onRequestDifferentDiscovery}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Retry lookup" }),
    );
    await waitFor(() => {
      expect(resolveDiscovery).toHaveBeenCalledTimes(6);
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Try a different lookup" }),
    );
    expect(onRequestDifferentDiscovery).toHaveBeenCalledOnce();
  });
});

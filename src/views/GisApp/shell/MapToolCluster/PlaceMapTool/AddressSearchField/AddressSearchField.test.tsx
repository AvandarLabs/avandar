import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { post: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: mocks.post } };
});

const { AddressSearchField } =
  await import("@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField");

const BIAS_BOX = { west: -74.1, south: 40.6, east: -73.8, north: 40.9 };
const CANDIDATE = {
  label: "350 West 46th Street, New York, NY 10036, United States of America",
  latitude: 40.7603,
  longitude: -73.9885,
  confidence: 0.95,
};

function _renderField(): ReturnType<typeof vi.fn> {
  const onPick = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(<AddressSearchField biasBox={BIAS_BOX} onPick={onPick} />, {
    wrapper: function QueryWrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
  return onPick;
}

function _search(text: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Search an address" }), {
    target: { value: text },
  });
}

async function _findCandidate(): Promise<HTMLElement> {
  return await screen.findByRole(
    "button",
    { name: CANDIDATE.label },
    { timeout: 2000 },
  );
}

describe("AddressSearchField", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ candidates: [CANDIDATE] });
  });

  it("searches the typed address with the map view as its bias", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    expect(mocks.post).toHaveBeenCalledWith({
      route: "geocode/search",
      body: { text: "W 46th St", biasBox: BIAS_BOX },
    });
  });

  it("credits OpenStreetMap under the results", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    expect(
      screen.getByRole("link", { name: "© OpenStreetMap contributors" }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  it("credits Geoapify under the results", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    expect(
      screen.getByRole("link", { name: "Powered by Geoapify" }),
    ).toHaveAttribute("href", "https://www.geoapify.com/");
  });

  it("picks a result", async () => {
    const onPick = _renderField();
    _search("W 46th St");
    fireEvent.click(await _findCandidate());
    expect(onPick).toHaveBeenCalledWith(CANDIDATE);
  });

  it("does not search fewer than three characters", async () => {
    _renderField();
    _search("W4");
    await new Promise((resolve) => {
      setTimeout(resolve, 700);
    });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("warns that the search is for public places, not home addresses", () => {
    _renderField();
    expect(
      screen.getByText(/never type a person's home address/),
    ).toBeVisible();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import css from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults.module.css";
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

  it("opens the credit links in a new tab without handing over the opener", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    for (const name of [
      "© OpenStreetMap contributors",
      "Powered by Geoapify",
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("lists the results as a list", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(
      within(items[0]!).getByRole("button", { name: CANDIDATE.label }),
    ).toBeVisible();
  });

  it("shows each result's full address, wrapping instead of clipping", async () => {
    _renderField();
    _search("W 46th St");
    const result = await _findCandidate();
    expect(result).toHaveTextContent(CANDIDATE.label);
    expect(result).toHaveClass(css.addressSearchResult!);
  });

  it("announces how many addresses were found", async () => {
    _renderField();
    _search("W 46th St");
    await _findCandidate();
    expect(screen.getByRole("status")).toHaveTextContent("1 address found");
  });

  it("announces when no address matches", async () => {
    mocks.post.mockResolvedValue({ candidates: [] });
    _renderField();
    _search("Nowhere at all");
    await waitFor(
      () => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "No addresses found",
        );
      },
      { timeout: 2000 },
    );
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

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  EMPTY_CATALOG_FACETS,
  EMPTY_CATALOG_LISTING_FILTERS,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogFilterRail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogFilterRail/DataCatalogFilterRail";
import type {
  CatalogFacets,
  CatalogListingFilters,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";

const FACETS_WITH_AGENCIES: CatalogFacets = {
  ...EMPTY_CATALOG_FACETS,
  sources: [
    { value: "City of New York", count: 12 },
    { value: "State of New York", count: 9 },
    { value: "City government of Chicago", count: 4 },
  ],
  organization2: [
    { value: "Taxi and Limousine Commission (TLC)", count: 7 },
    { value: "Department of Health", count: 5 },
  ],
  organization2Labels: ["Agency", "Department"],
  updatedWithin: { any: 25, pastMonth: 3, pastYear: 11, overAYear: 14 },
};

const FACETS_WITH_KEYWORDS: CatalogFacets = {
  ...FACETS_WITH_AGENCIES,
  tags: [
    { value: "taxi", count: 8 },
    { value: "fhv", count: 3 },
  ],
};

function _renderRail(options: {
  filters?: Partial<CatalogListingFilters>;
  facets?: CatalogFacets;
  keywordOptions?: CatalogFacets["tags"];
  onFiltersChange?: (filters: CatalogListingFilters) => void;
  onKeywordSearchChange?: (keywordSearch: string) => void;
}): ReturnType<typeof render> {
  const facets = options.facets ?? FACETS_WITH_AGENCIES;
  return render(
    <DataCatalogFilterRail
      filters={{ ...EMPTY_CATALOG_LISTING_FILTERS, ...options.filters }}
      facets={facets}
      keywordOptions={options.keywordOptions ?? facets.tags}
      onFiltersChange={options.onFiltersChange ?? vi.fn()}
      onKeywordSearchChange={options.onKeywordSearchChange ?? vi.fn()}
    />,
  );
}

/** Types into a facet's combobox and returns the options left showing. */
async function _searchFacet(
  name: string,
  search: string,
): Promise<HTMLElement[]> {
  const combobox = screen.getByRole("combobox", { name });
  fireEvent.click(combobox);
  fireEvent.change(combobox, { target: { value: search } });
  return await screen.findAllByRole("option");
}

describe("DataCatalogFilterRail", () => {
  it("does not include the catalog search, which lives on the tab row", () => {
    _renderRail({});

    expect(
      screen.queryByRole("textbox", { name: "Search open data" }),
    ).not.toBeInTheDocument();
  });

  it("labels the first facet Publisher", () => {
    _renderRail({});

    expect(screen.getAllByRole("combobox")[0]).toHaveAccessibleName(
      "Publisher",
    );
  });

  it("hides the second level while no publisher is chosen", () => {
    _renderRail({});

    expect(
      screen.queryByRole("combobox", { name: "Agency or Department" }),
    ).not.toBeInTheDocument();
  });

  it("names the second level after the drives' labels once a publisher is chosen", () => {
    _renderRail({ filters: { sources: ["City of New York"] } });

    expect(
      screen.getByRole("combobox", { name: "Agency or Department" }),
    ).toBeInTheDocument();
  });

  it("hides the second level when a chosen publisher has no second level", () => {
    _renderRail({
      filters: { sources: ["City of New York"] },
      facets: { ...FACETS_WITH_AGENCIES, organization2: [] },
    });

    expect(
      screen.queryByRole("combobox", { name: "Agency or Department" }),
    ).not.toBeInTheDocument();
  });

  it("names the second level Organization when the drives have no label", () => {
    _renderRail({
      filters: { sources: ["City of New York"] },
      facets: { ...FACETS_WITH_AGENCIES, organization2Labels: [] },
    });

    expect(
      screen.getByRole("combobox", { name: "Organization" }),
    ).toBeInTheDocument();
  });

  it("hides Topic when it has no options", () => {
    _renderRail({});

    expect(
      screen.queryByRole("combobox", { name: "Topic" }),
    ).not.toBeInTheDocument();
  });

  it("shows Topic when it has options", () => {
    _renderRail({
      facets: {
        ...FACETS_WITH_AGENCIES,
        domains: [{ value: "Transportation", count: 4 }],
      },
    });

    expect(screen.getByRole("combobox", { name: "Topic" })).toBeInTheDocument();
  });

  it("narrows a facet's options to those matching every typed fragment", async () => {
    _renderRail({});

    const options = await _searchFacet("Publisher", "ty gov");

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("City government of Chicago");
  });

  it("highlights the characters each typed fragment matched", async () => {
    _renderRail({});

    const [option] = await _searchFacet("Publisher", "ty gov");

    expect(
      within(option!)
        .getAllByTestId("facet-search-match")
        .map((match) => {
          return match.textContent;
        }),
    ).toEqual(["ty", "gov"]);
  });

  it("shows how many datasets each option would leave", async () => {
    _renderRail({});

    const options = await _searchFacet("Publisher", "state");

    expect(options[0]).toHaveTextContent(/State of New York\s*9/);
  });

  it("adds a picked option to the filters", async () => {
    const onFiltersChange = vi.fn();
    _renderRail({ onFiltersChange });

    const options = await _searchFacet("Publisher", "state");
    fireEvent.click(options[0]!);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sources: ["State of New York"] }),
    );
  });

  it("checks off a chosen value in the dropdown and no other", async () => {
    _renderRail({ filters: { sources: ["State of New York"] } });

    const options = await _searchFacet("Publisher", "york");

    expect(
      options.map((option) => {
        return within(option).queryByTestId("facet-option-check") !== null;
      }),
    ).toEqual([false, true]);
  });

  it("drops a chosen value from the filters when its pill is removed", () => {
    const onFiltersChange = vi.fn();
    _renderRail({
      filters: { sources: ["City of New York", "State of New York"] },
      onFiltersChange,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove City of New York" }),
    );

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sources: ["State of New York"] }),
    );
  });

  it("drops every chosen value of a facet when it is cleared", () => {
    const onFiltersChange = vi.fn();
    _renderRail({
      filters: { sources: ["City of New York", "State of New York"] },
      onFiltersChange,
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Publisher" }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sources: [] }),
    );
  });

  it("shows a chosen value as a pill even when the facet no longer offers it", () => {
    _renderRail({
      filters: { sources: ["Gone County"] },
      facets: { ...FACETS_WITH_AGENCIES, organization2: [] },
    });

    expect(
      screen.getByRole("button", { name: "Remove Gone County" }),
    ).toBeInTheDocument();
  });

  it("sets Last updated to the single window picked", async () => {
    const onFiltersChange = vi.fn();
    _renderRail({ onFiltersChange });

    const options = await _searchFacet("Last updated", "month");
    fireEvent.click(options[0]!);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ updatedWithin: "pastMonth" }),
    );
  });

  it("offers Keywords to browse before any keyword is chosen", async () => {
    _renderRail({ facets: FACETS_WITH_KEYWORDS });

    expect(await _searchFacet("Keywords", "")).toHaveLength(2);
  });

  it("adds a picked keyword to the filters", async () => {
    const onFiltersChange = vi.fn();
    _renderRail({ facets: FACETS_WITH_KEYWORDS, onFiltersChange });

    const options = await _searchFacet("Keywords", "tax");
    fireEvent.click(options[0]!);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["taxi"] }),
    );
  });

  it("reports what is typed into Keywords, so the keywords can be searched", () => {
    const onKeywordSearchChange = vi.fn();
    _renderRail({ facets: FACETS_WITH_KEYWORDS, onKeywordSearchChange });

    fireEvent.change(screen.getByRole("combobox", { name: "Keywords" }), {
      target: { value: "fer" },
    });

    expect(onKeywordSearchChange).toHaveBeenLastCalledWith("fer");
  });

  it("keeps Keywords on screen while a search there finds nothing", () => {
    const { rerender } = _renderRail({ facets: FACETS_WITH_KEYWORDS });
    const combobox = screen.getByRole("combobox", { name: "Keywords" });
    fireEvent.click(combobox);
    fireEvent.change(combobox, { target: { value: "zzz" } });

    rerender(
      <DataCatalogFilterRail
        filters={EMPTY_CATALOG_LISTING_FILTERS}
        facets={FACETS_WITH_KEYWORDS}
        keywordOptions={[]}
        onFiltersChange={vi.fn()}
        onKeywordSearchChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Keywords" }),
    ).toBeInTheDocument();
  });

  it("drops a keyword from the filters when its pill is removed", () => {
    const onFiltersChange = vi.fn();
    _renderRail({
      facets: FACETS_WITH_KEYWORDS,
      filters: { tags: ["taxi", "fhv"] },
      onFiltersChange,
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove taxi" }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["fhv"] }),
    );
  });
});

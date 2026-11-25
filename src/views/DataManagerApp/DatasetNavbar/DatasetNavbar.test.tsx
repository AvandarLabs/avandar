import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [undefined, false, {}];
    },
  };
});

vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return true;
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      useGetAll: () => {
        return [[]];
      },
      useGetById: () => {
        return [undefined];
      },
    },
  };
});

vi.mock("@avandar/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    NavLinkList: ({
      links,
    }: {
      links: ReadonlyArray<{ key: string; label: ReactNode }>;
    }) => {
      return (
        <div>
          {links.map((link) => {
            return <div key={link.key}>{link.label}</div>;
          })}
        </div>
      );
    },
  };
});

const LONG_NAME =
  "Main_Routine_Vaccine_Guidance_For_School_Immunization_Survey";

function _createDataset(name: string): Dataset.T {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name,
    sourceType: "csv_file",
  } as Dataset.T;
}

describe("DatasetNavbar", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(480);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);
  });

  it("shows the full dataset name when a truncated name is hovered", async () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset(LONG_NAME)]}
        isLoading={false}
      />,
    );

    const name = screen.getByText(LONG_NAME);
    act(() => {
      fireEvent.mouseEnter(name);
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(LONG_NAME);
    });
  });

  it("does not show a tooltip when the dataset name fits", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);

    render(
      <DatasetNavbar
        datasets={[_createDataset("Borough Boundaries")]}
        isLoading={false}
      />,
    );

    const name = screen.getByText("Borough Boundaries");
    act(() => {
      fireEvent.mouseEnter(name);
    });

    await expect(
      screen.findByRole("tooltip", undefined, { timeout: 300 }),
    ).rejects.toThrow();
  });
});

function _createDictionary(
  name: string,
  id = "22222222-2222-4222-8222-222222222222",
): DataDictionary.T {
  return {
    id,
    name,
  } as DataDictionary.T;
}

describe("DatasetNavbar dictionaries", () => {
  it("lists dictionaries under their own heading in an All data list", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        dictionaries={[_createDictionary("NYS measles case report")]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("All data")).toBeInTheDocument();
    expect(screen.getByText("Dictionaries")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("NYS measles case report")).toBeInTheDocument();
    expect(screen.getByText("Bronx line list")).toBeInTheDocument();
  });

  it("shows no group headings when only datasets of one kind exist", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        isLoading={false}
      />,
    );

    expect(screen.queryByText("Dictionaries")).not.toBeInTheDocument();
    expect(screen.queryByText("CSV")).not.toBeInTheDocument();
  });

  it("shows no group headings when only dictionaries exist", () => {
    render(
      <DatasetNavbar
        datasets={[]}
        dictionaries={[_createDictionary("NYS measles case report")]}
        isLoading={false}
      />,
    );

    expect(screen.getByText("NYS measles case report")).toBeInTheDocument();
    expect(screen.queryByText("Dictionaries")).not.toBeInTheDocument();
  });

  it("shows the filter field once datasets and dictionaries total 8", () => {
    const datasets = Array.from({ length: 5 }, (_, index) => {
      return {
        ..._createDataset(`Dataset ${index}`),
        id: `11111111-1111-4111-8111-11111111111${index}`,
      } as Dataset.T;
    });
    const dictionaries = Array.from({ length: 3 }, (_, index) => {
      return _createDictionary(
        `Dictionary ${index}`,
        `22222222-2222-4222-8222-22222222222${index}`,
      );
    });
    const { rerender } = render(
      <DatasetNavbar
        datasets={datasets}
        dictionaries={dictionaries.slice(0, 2)}
        isLoading={false}
      />,
    );
    expect(
      screen.queryByPlaceholderText("Filter data"),
    ).not.toBeInTheDocument();

    rerender(
      <DatasetNavbar
        datasets={datasets}
        dictionaries={dictionaries}
        isLoading={false}
      />,
    );
    expect(screen.getByPlaceholderText("Filter data")).toBeInTheDocument();
  });

  it("says No data yet when empty and Nothing matches your filter when filtered out", async () => {
    const { rerender } = render(
      <DatasetNavbar datasets={[]} dictionaries={[]} isLoading={false} />,
    );
    expect(screen.getByText("No data yet")).toBeInTheDocument();

    const dictionaries = Array.from({ length: 8 }, (_, index) => {
      return _createDictionary(
        `Dictionary ${index}`,
        `22222222-2222-4222-8222-22222222222${index}`,
      );
    });
    rerender(
      <DatasetNavbar
        datasets={[]}
        dictionaries={dictionaries}
        isLoading={false}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Filter data"), {
      target: { value: "zzz" },
    });

    expect(
      await screen.findByText("Nothing matches your filter"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument();
  });
});

function _createCrosswalk(
  name: string,
  id = "33333333-3333-4333-8333-333333333333",
): Crosswalk.T {
  return { id, name } as Crosswalk.T;
}

describe("DatasetNavbar crosswalks", () => {
  it("lists crosswalks under their own heading, after the dictionaries", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        dictionaries={[_createDictionary("NYS measles case report")]}
        crosswalks={[_createCrosswalk("Measles line lists")]}
        isLoading={false}
      />,
    );

    const dictionariesHeading = screen.getByText("Dictionaries");
    const crosswalksHeading = screen.getByText("Crosswalks");
    expect(screen.getByText("Measles line lists")).toBeInTheDocument();
    expect(
      dictionariesHeading.compareDocumentPosition(crosswalksHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows no Crosswalks heading when there are none", () => {
    render(
      <DatasetNavbar
        datasets={[_createDataset("Bronx line list")]}
        dictionaries={[_createDictionary("NYS measles case report")]}
        crosswalks={[]}
        isLoading={false}
      />,
    );

    expect(screen.queryByText("Crosswalks")).not.toBeInTheDocument();
  });

  it("counts crosswalks toward the filter and filters them by name", async () => {
    const datasets = Array.from({ length: 7 }, (_, index) => {
      return {
        ..._createDataset(`Dataset ${index}`),
        id: `11111111-1111-4111-8111-11111111111${index}`,
      } as Dataset.T;
    });
    render(
      <DatasetNavbar
        datasets={datasets}
        crosswalks={[_createCrosswalk("Measles line lists")]}
        isLoading={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Filter data"), {
      target: { value: "measles" },
    });

    expect(await screen.findByText("Measles line lists")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Dataset 0")).not.toBeInTheDocument();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { DatasetNavbar } from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar";
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

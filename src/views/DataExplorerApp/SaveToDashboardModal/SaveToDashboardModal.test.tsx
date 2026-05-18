import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { UserId } from "$/models/User/User.types";
import type { UserProfileId } from "$/models/User/UserProfile.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement } from "react";

const {
  insertMock,
  updateMock,
  useGetAllMock,
  useInsertConfigSpy,
  useUpdateConfigSpy,
} = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    useGetAllMock: vi.fn(),
    useInsertConfigSpy: vi.fn(),
    useUpdateConfigSpy: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return {
        id: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
        slug: "test-ws",
      };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: (): [
      { userId: UserId; profileId: UserProfileId },
      boolean,
    ] => {
      return [
        {
          userId: "00000000-0000-4000-8000-0000000000bb" as UserId,
          profileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
        },
        false,
      ];
    },
  };
});

vi.mock("@/clients/dashboards/DashboardClient", () => {
  return {
    DashboardClient: {
      QueryKeys: {
        getAll: (): string[] => {
          return ["dashboards"];
        },
        getById: (): string[] => {
          return ["dashboards", "id"];
        },
      },
      useGetAll: (...args: unknown[]): [Dashboard.T[] | undefined, boolean] => {
        return useGetAllMock(...args);
      },
      useInsert: (config: {
        onSuccess?: (dashboard: Dashboard.T) => void;
      }): [(args: { data: Dashboard.T }) => void, boolean] => {
        useInsertConfigSpy(config);
        return [
          (args) => {
            insertMock(args);
            config.onSuccess?.(args.data);
          },
          false,
        ];
      },
      useUpdate: (config: {
        onSuccess?: (dashboard: Dashboard.T) => void;
      }): [
        (args: { id: DashboardId; data: Partial<Dashboard.T> }) => void,
        boolean,
      ] => {
        useUpdateConfigSpy(config);
        return [
          (args) => {
            updateMock(args);
            const dashboards: Dashboard.T[] =
              useGetAllMock.mock.results[0]?.value?.[0] ?? [];
            const matched = dashboards.find((d) => {
              return d.id === args.id;
            });
            if (matched && config.onSuccess) {
              config.onSuccess({ ...matched, ...args.data });
            }
          },
          false,
        ];
      },
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: (): ReturnType<typeof vi.fn> => {
      return vi.fn();
    },
  };
});

vi.mock("@mantine/notifications", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@mantine/notifications")>();
  return {
    ...actual,
    notifications: {
      ...actual.notifications,
      show: vi.fn(),
    },
  };
});

function _makeDashboard(overrides: Partial<Dashboard.T> = {}): Dashboard.T {
  const id = (overrides.id ??
    "00000000-0000-4000-8000-000000000001") as DashboardId;
  return {
    __type: "Dashboard",
    id,
    name: "Existing Dashboard",
    slug: undefined,
    description: undefined,
    isPublic: false,
    isRestricted: false,
    ownerId: "00000000-0000-4000-8000-0000000000bb" as UserId,
    ownerProfileId: "00000000-0000-4000-8000-0000000000cc" as UserProfileId,
    workspaceId: "00000000-0000-4000-8000-0000000000aa" as Workspace.Id,
    config: {
      root: { props: { title: "Existing" } },
      content: [{ type: "HeadingBlock", props: { id: "h-1", text: "Pre" } }],
    } as unknown as Dashboard.T["config"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

type ModalProps = Parameters<typeof SaveToDashboardModal>[0];

function renderModal(props: Partial<ModalProps> = {}): {
  onClose: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AvandarUiProvider>
        <SaveToDashboardModal
          rawSQL="SELECT 1"
          prompt="Show one"
          vizType="table"
          vizConfig={{ vizType: "table" }}
          workspaceSlug="test-ws"
          onClose={onClose}
          {...props}
        />
      </AvandarUiProvider>
    </QueryClientProvider> as ReactElement,
  );
  return { onClose };
}

describe("SaveToDashboardModal", () => {
  beforeEach(() => {
    insertMock.mockClear();
    updateMock.mockClear();
    useGetAllMock.mockReset();
    useInsertConfigSpy.mockClear();
    useUpdateConfigSpy.mockClear();
  });

  describe("when the user has no dashboards", () => {
    beforeEach(() => {
      useGetAllMock.mockReturnValue([[], false]);
    });

    it("defaults to create mode with no back link", () => {
      renderModal();

      expect(
        screen.getByText(/we'll add this visualization to your new dashboard/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /back to dashboards/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText(/search dashboards/i),
      ).not.toBeInTheDocument();
    });

    it("prefills the name with 'Untitled dashboard'", () => {
      renderModal();

      const input = screen.getByLabelText(/dashboard name/i) as HTMLInputElement;
      expect(input.value).toBe("Untitled dashboard");
    });

    it("creates the dashboard with the DataViz block as the only content entry", async () => {
      const { onClose } = renderModal();

      const input = screen.getByLabelText(/dashboard name/i);
      fireEvent.change(input, { target: { value: "My new board" } });

      fireEvent.click(
        screen.getByRole("button", { name: /create dashboard & save/i }),
      );

      await waitFor(() => {
        return expect(insertMock).toHaveBeenCalledTimes(1);
      });
      const insertArgs = insertMock.mock.calls[0]![0];
      type InsertedBlock = {
        type: string;
        props: { nlQuery: { rawSql: string } };
      };
      const insertedConfig = insertArgs.data.config as {
        content: InsertedBlock[];
        root: { props: { title: string } };
      };
      expect(insertedConfig.content).toHaveLength(1);
      expect(insertedConfig.content[0]!.type).toBe("DataViz");
      expect(insertedConfig.content[0]!.props.nlQuery.rawSql).toBe("SELECT 1");
      expect(insertedConfig.root.props.title).toBe("My new board");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the user has dashboards", () => {
    const dashboardA = _makeDashboard({
      id: "00000000-0000-4000-8000-000000000010" as DashboardId,
      name: "Alpha board",
    });
    const dashboardB = _makeDashboard({
      id: "00000000-0000-4000-8000-000000000011" as DashboardId,
      name: "Beta board",
    });

    beforeEach(() => {
      useGetAllMock.mockReturnValue([[dashboardA, dashboardB], false]);
    });

    it("defaults to list mode and renders one row per dashboard", () => {
      renderModal();

      expect(
        screen.getByText(/pick a dashboard, or create a new one/i),
      ).toBeInTheDocument();
      const listbox = screen.getByRole("listbox", { name: /dashboards/i });
      const rows = within(listbox).getAllByRole("option");
      expect(rows).toHaveLength(2);
      expect(rows[0]!).toHaveTextContent("Alpha board");
      expect(rows[1]!).toHaveTextContent("Beta board");
    });

    it("filters rows as the user types in the search", () => {
      renderModal();

      fireEvent.change(screen.getByPlaceholderText(/search dashboards/i), {
        target: { value: "beta" },
      });

      const listbox = screen.getByRole("listbox");
      const rows = within(listbox).getAllByRole("option");
      expect(rows).toHaveLength(1);
      expect(rows[0]!).toHaveTextContent("Beta board");
    });

    it("keeps Save disabled until a dashboard is selected, then appends the block on save", async () => {
      const { onClose } = renderModal();

      const saveButton = screen.getByRole("button", {
        name: /save to dashboard/i,
      });
      expect(saveButton).toBeDisabled();

      const listbox = screen.getByRole("listbox");
      const rows = within(listbox).getAllByRole("option");
      fireEvent.click(rows[1]!);
      expect(saveButton).not.toBeDisabled();

      fireEvent.click(saveButton);

      await waitFor(() => {
        return expect(updateMock).toHaveBeenCalledTimes(1);
      });
      const updateArgs = updateMock.mock.calls[0]![0];
      expect(updateArgs.id).toBe(dashboardB.id);

      const updatedConfig = updateArgs.data.config as {
        content: Array<{ type: string }>;
      };
      expect(updatedConfig.content).toHaveLength(2);
      expect(updatedConfig.content[0]!.type).toBe("HeadingBlock");
      expect(updatedConfig.content[1]!.type).toBe("DataViz");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("switches to create mode with a Back link when '+ Create new dashboard' is clicked", () => {
      renderModal();

      fireEvent.click(
        screen.getByRole("button", { name: /create new dashboard/i }),
      );

      expect(
        screen.getByText(/we'll add this visualization to your new dashboard/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /back to dashboards/i }),
      ).toBeInTheDocument();
    });

    it("returns to list mode when Back is clicked", () => {
      renderModal();
      fireEvent.click(
        screen.getByRole("button", { name: /create new dashboard/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /back to dashboards/i }),
      );

      expect(
        screen.getByText(/pick a dashboard, or create a new one/i),
      ).toBeInTheDocument();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });
});

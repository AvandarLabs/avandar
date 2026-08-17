import { vi } from "vitest";

/**
 * The client and hook doubles every `ShareResourceModal` suite installs.
 *
 * This module deliberately imports nothing from the app. Each suite's
 * `vi.mock` factory reaches it through a dynamic `import()`, which runs while
 * the component's own module graph is still evaluating; an app import here
 * would make that a cycle and hand the factory a half-initialised module.
 *
 * Vitest gives every test file its own module registry, so the spies below are
 * per-suite state, not shared across files.
 */

const MEMBERS = [
  {
    userId: "user-owner",
    displayName: "John Snow",
    fullName: "John Snow",
    email: "john@example.com",
  },
  {
    userId: "user-1",
    displayName: "Alice",
    fullName: "Alice Example",
    email: "alice@example.com",
  },
];

/** The stored sharing state a suite may vary before rendering. */
type SharingStateDouble = {
  isRestricted: boolean;
  ownerId: string;
  shares: unknown[];
};

/**
 * Mutable query results, so a test can put the member lookup back into its
 * loading state or vary the stored sharing state.
 */
const state: {
  membersResult: readonly [unknown, boolean];
  sharingState: SharingStateDouble;
  isSharingStateFetching: boolean;
  /**
   * The upsert mutation's `onError`, captured so the rejection branch can be
   * driven without a real PostgREST round trip.
   */
  upsertOnError: ((error: Error) => void) | undefined;
} = {
  membersResult: [undefined, true],
  sharingState: { isRestricted: false, ownerId: "user-owner", shares: [] },
  isSharingStateFetching: false,
  upsertOnError: undefined,
};

const spies = {
  getResourceSharingStateOptions: vi.fn(),
  makeResourcePrivate: vi.fn(),
  setRestricted: vi.fn(),
  upsertShare: vi.fn(),
  notifyError: vi.fn(),
};

export const ShareResourceModalTestMocks = {
  MEMBERS,
  state,
  spies,

  /** Restores the default "loaded, unrestricted, owner-only" world. */
  reset: (): void => {
    state.membersResult = [MEMBERS, false];
    state.sharingState = {
      isRestricted: false,
      ownerId: "user-owner",
      shares: [],
    };
    state.isSharingStateFetching = false;
    state.upsertOnError = undefined;
    spies.getResourceSharingStateOptions.mockClear();
    spies.makeResourcePrivate.mockClear();
    spies.setRestricted.mockClear();
    spies.notifyError.mockClear();
    spies.upsertShare.mockClear();
  },

  makeNotifyModule: () => {
    return { notifyError: spies.notifyError, notifySuccess: vi.fn() };
  },

  makeCurrentWorkspaceModule: () => {
    return {
      useCurrentWorkspace: () => {
        return {
          id: "workspace-id-1",
          slug: "test-workspace",
          name: "Test Workspace",
          ownerId: "user-owner",
        };
      },
    };
  },

  makeResourceShareClientModule: () => {
    return {
      ResourceShareClient: {
        QueryKeys: {
          getResourceSharingState: vi.fn(() => {
            return ["share-state-key"];
          }),
        },
        useGetResourceSharingState: (options: unknown) => {
          spies.getResourceSharingStateOptions(options);
          return [
            state.sharingState,
            false,
            { isFetching: state.isSharingStateFetching },
          ] as const;
        },
        useMakeResourcePrivate: () => {
          return [spies.makeResourcePrivate, false] as const;
        },
        useUpsertResourceShare: (options: {
          onError: (error: Error) => void;
        }) => {
          state.upsertOnError = options.onError;
          return [spies.upsertShare, false] as const;
        },
        useDeleteResourceShare: () => {
          return [vi.fn()] as const;
        },
        useSetResourceRestricted: () => {
          return [spies.setRestricted, false] as const;
        },
      },
    };
  },

  makeWorkspaceClientModule: () => {
    return {
      WorkspaceClient: {
        useGetUsersForWorkspace: () => {
          return state.membersResult;
        },
      },
    };
  },

  makeCurrentUserModule: () => {
    return {
      useCurrentUser: () => {
        return { id: "user-owner", email: "john@example.com" };
      },
    };
  },

  makePermissionsClientModule: () => {
    return {
      PermissionsClient: {
        useGetUserGroups: () => {
          return [[{ id: "group-1", name: "Engineering" }], false] as const;
        },
      },
    };
  },
} as const;

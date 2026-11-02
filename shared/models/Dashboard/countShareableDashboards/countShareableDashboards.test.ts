import { describe, expect, it } from "vitest";
import { countShareableDashboards } from "$/models/Dashboard/countShareableDashboards/countShareableDashboards.ts";
import type { DashboardVisibility } from "$/models/Dashboard/Dashboard.types.ts";

const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER_USER = "00000000-0000-4000-8000-0000000000a2";
const GROUP = "00000000-0000-4000-8000-0000000000b1";

/**
 * Builds a dashboard row. Defaults are the harmless case (a private draft), so
 * every test only states the fields the rule under test actually turns on.
 */
function dashboard(
  overrides: Readonly<{
    id: string;
    visibility: DashboardVisibility;
    isRestricted: boolean;
    ownerId?: string;
  }>,
): {
  id: string;
  ownerId: string;
  visibility: DashboardVisibility;
  isRestricted: boolean;
} {
  return {
    id: overrides.id,
    ownerId: overrides.ownerId ?? OWNER,
    visibility: overrides.visibility,
    isRestricted: overrides.isRestricted,
  };
}

describe("countShareableDashboards", () => {
  it("counts nothing when there is nothing to count", () => {
    expect(countShareableDashboards({ dashboards: [], shares: [] })).toBe(0);
  });

  describe("draft dashboards never count", () => {
    it.each([true, false])("with isRestricted %s", (isRestricted) => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({ id: "d1", visibility: "draft", isRestricted }),
          ],
          shares: [],
        }),
      ).toBe(0);
    });

    it("even when shared with somebody other than the owner", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({ id: "d1", visibility: "draft", isRestricted: true }),
          ],
          shares: [
            {
              resourceId: "d1",
              principalType: "user",
              principalId: OTHER_USER,
            },
          ],
        }),
      ).toBe(0);
    });
  });

  describe("workspace dashboards", () => {
    it("does not count one that is private to its owner", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [],
        }),
      ).toBe(0);
    });

    it("counts an unrestricted one, which every workspace role can reach", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: false,
            }),
          ],
          shares: [],
        }),
      ).toBe(1);
    });

    it("counts a restricted one shared with another user", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [
            {
              resourceId: "d1",
              principalType: "user",
              principalId: OTHER_USER,
            },
          ],
        }),
      ).toBe(1);
    });

    it("does not count a restricted one whose only share names its own owner", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
              ownerId: OWNER,
            }),
          ],
          shares: [
            { resourceId: "d1", principalType: "user", principalId: OWNER },
          ],
        }),
      ).toBe(0);
    });

    it("counts a restricted one with a user_group share", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [
            {
              resourceId: "d1",
              principalType: "user_group",
              principalId: GROUP,
            },
          ],
        }),
      ).toBe(1);
    });

    it("counts a restricted one with a workspace share, whose principalId is null by convention", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [
            {
              resourceId: "d1",
              principalType: "workspace",
              principalId: null,
            },
          ],
        }),
      ).toBe(1);
    });

    it("ignores the owner share but still counts a second, non-owner share", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [
            { resourceId: "d1", principalType: "user", principalId: OWNER },
            {
              resourceId: "d1",
              principalType: "user",
              principalId: OTHER_USER,
            },
          ],
        }),
      ).toBe(1);
    });

    it("does not let a share on one dashboard leak onto another", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({
              id: "d1",
              visibility: "workspace",
              isRestricted: true,
            }),
            dashboard({
              id: "d2",
              visibility: "workspace",
              isRestricted: true,
            }),
          ],
          shares: [
            {
              resourceId: "d1",
              principalType: "user",
              principalId: OTHER_USER,
            },
          ],
        }),
      ).toBe(1);
    });
  });

  describe("public dashboards always count", () => {
    // A public dashboard is world-readable through the anon policy no matter
    // what its share rows say, so no combination of restriction or sharing may
    // hide it from the count.
    it.each([true, false])(
      "with isRestricted %s and no shares",
      (isRestricted) => {
        expect(
          countShareableDashboards({
            dashboards: [
              dashboard({ id: "d1", visibility: "public", isRestricted }),
            ],
            shares: [],
          }),
        ).toBe(1);
      },
    );

    it("even when restricted and shared only with its own owner", () => {
      expect(
        countShareableDashboards({
          dashboards: [
            dashboard({ id: "d1", visibility: "public", isRestricted: true }),
          ],
          shares: [
            { resourceId: "d1", principalType: "user", principalId: OWNER },
          ],
        }),
      ).toBe(1);
    });
  });

  it("totals a mixed workspace correctly", () => {
    const count = countShareableDashboards({
      dashboards: [
        // Does not count: drafts, whatever else is true of them.
        dashboard({
          id: "draft-open",
          visibility: "draft",
          isRestricted: false,
        }),
        dashboard({
          id: "draft-shut",
          visibility: "draft",
          isRestricted: true,
        }),

        // Does not count: private to its owner.
        dashboard({
          id: "ws-private",
          visibility: "workspace",
          isRestricted: true,
        }),

        // Does not count: restricted, and its only share is its own owner.
        dashboard({
          id: "ws-self-shared",
          visibility: "workspace",
          isRestricted: true,
          ownerId: OTHER_USER,
        }),

        // Counts: reachable by the whole workspace.
        dashboard({
          id: "ws-open",
          visibility: "workspace",
          isRestricted: false,
        }),

        // Counts: restricted but shared with a group.
        dashboard({
          id: "ws-group-shared",
          visibility: "workspace",
          isRestricted: true,
        }),

        // Counts: public, twice over, restricted or not.
        dashboard({
          id: "pub-open",
          visibility: "public",
          isRestricted: false,
        }),
        dashboard({ id: "pub-shut", visibility: "public", isRestricted: true }),
      ],
      shares: [
        {
          resourceId: "ws-self-shared",
          principalType: "user",
          principalId: OTHER_USER,
        },
        {
          resourceId: "ws-group-shared",
          principalType: "user_group",
          principalId: GROUP,
        },
      ],
    });

    expect(count).toBe(4);
  });
});

import { expect, it } from "vitest";
import { isPluginContributionActive } from "$/agent/dataAgent/isPluginContributionActive.ts";

it("is active only when enabled and every permission is granted", () => {
  expect(
    isPluginContributionActive({
      isEnabled: true,
      grantedPermissions: ["data:context"],
      manifestPermissions: ["data:context"],
    }),
  ).toBe(true);
  expect(
    isPluginContributionActive({
      isEnabled: false,
      grantedPermissions: ["data:context"],
      manifestPermissions: ["data:context"],
    }),
  ).toBe(false);
  expect(
    isPluginContributionActive({
      isEnabled: true,
      grantedPermissions: [],
      manifestPermissions: ["data:context"],
    }),
  ).toBe(false);
});

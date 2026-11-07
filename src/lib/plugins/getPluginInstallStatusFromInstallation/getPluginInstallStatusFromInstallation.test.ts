import { describe, expect, it } from "vitest";
import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";

const GRANTED = { isEnabled: true, grantedPermissions: ["data:context"] };

type StatusCase = {
  scenario: string;
  installation: Parameters<
    typeof getPluginInstallStatusFromInstallation
  >[0]["installation"];
  manifestPermissions: readonly string[] | undefined;
  expected: PluginInstallStatus;
};

const STATUS_CASES: readonly StatusCase[] = [
  {
    scenario: "the workspace has no installation",
    installation: undefined,
    manifestPermissions: ["data:context"],
    expected: "not_installed",
  },
  {
    scenario: "the deployment no longer bundles the plugin",
    installation: GRANTED,
    manifestPermissions: undefined,
    expected: "unavailable",
  },
  {
    scenario: "the installation is disabled",
    installation: { ...GRANTED, isEnabled: false },
    manifestPermissions: ["data:context"],
    expected: "disabled",
  },
  {
    scenario: "the manifest asks for a permission that is not granted",
    installation: GRANTED,
    manifestPermissions: ["data:context", "data:read"],
    expected: "needs_review",
  },
  {
    scenario: "every manifest permission is granted",
    installation: GRANTED,
    manifestPermissions: ["data:context"],
    expected: "installed",
  },
  {
    scenario: "the manifest asks for no permissions",
    installation: GRANTED,
    manifestPermissions: [],
    expected: "installed",
  },
];

describe("getPluginInstallStatusFromInstallation", () => {
  it.each(STATUS_CASES)(
    "returns $expected when $scenario",
    ({ installation, manifestPermissions, expected }) => {
      expect(
        getPluginInstallStatusFromInstallation({
          installation,
          manifestPermissions,
        }),
      ).toBe(expected);
    },
  );
});

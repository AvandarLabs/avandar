import { FIXTURES } from "../../PortableWorkTransfer.fixtures";
import { assertUnloadingHandFollowsRigidId as _assertUnloadingHandFollowsRigidId } from "./assertUnloadingHandFollowsRigidId";

/**
 * Asserts the unloading hand follows each rigid copy and stays above the
 * open folio.
 */
export function assertUnloadingHandFollowsRigidFixture(
  fixture: (typeof FIXTURES)[number]["input"],
): void {
  const input = { ...fixture, transferState: "accepted" as const };
  input.artifacts.forEach(({ id }, index) => {
    return _assertUnloadingHandFollowsRigidId({ id, index, input });
  });
}

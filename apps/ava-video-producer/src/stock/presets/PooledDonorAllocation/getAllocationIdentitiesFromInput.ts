import { propEq } from "@avandar/utils";
import type { Input } from "./PooledDonorAllocation.schema";
/** Data for getAllocationIdentitiesFromInput. */
type GetAllocationIdentitiesResult = {
  donor: {
    id: string;
    donorLabel: string;
    mark: string;
    credits: number;
    earmarkedRequestId: string | null;
  };
  donorIndex: number;
  unitIndex: number;
  requestId: string | null;
};

/**
 * Expand each authored credit exactly once and retain null as a residual
 * destination.
 */
export function getAllocationIdentitiesFromInput(
  input: Readonly<Input>,
): GetAllocationIdentitiesResult[] {
  return input.contributions.flatMap((donor, donorIndex) => {
    const destinations = input.allocations
      .filter(propEq("contributionId", donor.id))
      .flatMap(({ requestId, credits }) => {
        return Array.from({ length: credits }, () => {
          return requestId;
        });
      });
    return Array.from({ length: donor.credits }, (_, unitIndex) => {
      return {
        donor,
        donorIndex,
        unitIndex,
        requestId: destinations[unitIndex] ?? null,
      };
    });
  });
}

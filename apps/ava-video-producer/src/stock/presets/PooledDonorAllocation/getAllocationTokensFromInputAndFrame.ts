import { prop } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { getAllocationIdentitiesFromInput } from "./getAllocationIdentitiesFromInput";
import { getDonorTrayFromInputAndFrame } from "./getDonorTrayFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
type Identity = ReturnType<typeof getAllocationIdentitiesFromInput>[number];
/** Data for getAllocationTokensFromInputAndFrame. */
type GetAllocationTokensResult = {
  x: number;
  y: number;
  owner: string;
  arrived: boolean;
  donor: {
    id: string;
    donorLabel: string;
    mark: string;
    credits: number;
    earmarkedRequestId: string | null;
  };
  donorIndex: number;
  unitIndex: number;
  requestId: string;
};

function _getPlacement({
  input,
  identities,
  index,
}: Readonly<{ input: Input; identities: Identity[]; index: number }>) {
  const token = identities[index];
  const destinations = [...input.requests.map(prop("id")), null];
  const groupIndex = destinations.indexOf(token.requestId);
  const counts = destinations.map(
    (id) => identities.filter(({ requestId }) => requestId === id).length,
  );
  const precedingColumns = counts
    .slice(0, groupIndex)
    .reduce(
      (sum, numDestinationTokens) => sum + Math.min(7, numDestinationTokens),
      0,
    );
  const ordinal = identities
    .slice(0, index)
    .filter(({ requestId }) => requestId === token.requestId).length;
  const column = ordinal % 7;
  const row = Math.floor(ordinal / 7);
  const fanOffset =
    input.envelopeArrangement === "fan"
      ? Math.abs(groupIndex - (input.requests.length - 1) / 2) * 12
      : 0;
  return {
    requestIndex: groupIndex,
    poolX: 280 + precedingColumns * 36 + groupIndex * 20 + column * 36,
    poolY: 308 - row * 38,
    targetX: 60 + groupIndex * (880 / input.requests.length) + column * 36,
    targetY: 400 + fanOffset - row * 38,
    corridorY: 400 - row * 38,
  };
}

/**
 * Every authored credit tips into the pool, then shares its request scoop's
 * rigid travel.
 */
export function getAllocationTokensFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): GetAllocationTokensResult[] {
  const identities = getAllocationIdentitiesFromInput(input);
  return identities.map((token, index) => {
    const placement = _getPlacement({ input, identities, index });
    const tray = getDonorTrayFromInputAndFrame({
      input,
      frame,
      donorIndex: token.donorIndex,
    });
    const pooling = ramp(frame, 32 + token.donorIndex * 3, 20, EASE.inOut);
    const sourceX = tray.x - 20 + (token.unitIndex * 32 + 20) * tray.cosine;
    const sourceY = tray.y + (token.unitIndex * 32 + 20) * tray.sine;
    const x = mix(Math.min(1, pooling * 2), sourceX, placement.poolX);
    const y = mix(Math.max(0, pooling * 2 - 1), sourceY, placement.poolY);
    const allocation =
      token.requestId === null
        ? 0
        : ramp(frame, 64 + placement.requestIndex * 20, 14, EASE.inOut);
    const descend = Math.min(1, allocation / 0.45);
    const slide = Math.max(0, Math.min(1, (allocation - 0.45) / 0.4));
    const insert = Math.max(0, (allocation - 0.85) / 0.15);
    return {
      ...token,
      x: mix(slide, x, placement.targetX),
      y:
        allocation === 0
          ? y
          : mix(
              insert,
              mix(descend, y, placement.corridorY),
              placement.targetY,
            ),
      owner:
        allocation === 1
          ? "request"
          : allocation > 0
            ? "coordinator"
            : pooling === 1
              ? "pool"
              : "donor",
      arrived: allocation === 1,
    };
  });
}

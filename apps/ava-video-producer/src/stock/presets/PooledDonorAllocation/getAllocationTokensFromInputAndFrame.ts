import { prop } from "@avandar/utils";
import { mix } from "../../../motion";
import { getAllocationIdentitiesFromInput } from "./getAllocationIdentitiesFromInput";
import { getDonorTrayFromInputAndFrame } from "./getDonorTrayFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./PooledDonorAllocation.schema";

type GetPooledPointOptions = {
  token: Identity;
  tray: ReturnType<typeof getDonorTrayFromInputAndFrame>;
  placement: Placement;
  pooling: number;
};
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
  const counts = destinations.map((id) => {
    return identities.filter(({ requestId }) => {
      return requestId === id;
    }).length;
  });
  const precedingColumns = counts
    .slice(0, groupIndex)
    .reduce((sum, numDestinationTokens) => {
      return sum + Math.min(7, numDestinationTokens);
    }, 0);
  const ordinal = identities.slice(0, index).filter(({ requestId }) => {
    return requestId === token.requestId;
  }).length;
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
type AllocationTokensArgs = Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>;
type Placement = ReturnType<typeof _getPlacement>;
/** A credit tipping off its donor's tray, then across into the pool. */
function _getPooledPoint({
  token,
  tray,
  placement,
  pooling,
}: Readonly<GetPooledPointOptions>) {
  const sourceX = tray.x - 20 + (token.unitIndex * 32 + 20) * tray.cosine;
  const sourceY = tray.y + (token.unitIndex * 32 + 20) * tray.sine;
  return {
    x: mix(Math.min(1, pooling * 2), sourceX, placement.poolX),
    y: mix(Math.max(0, pooling * 2 - 1), sourceY, placement.poolY),
  };
}
/** A carried credit descends to the corridor, then drops into its request. */
function _getAllocatedY({
  allocation,
  y,
  placement,
}: Readonly<{ allocation: number; y: number; placement: Placement }>): number {
  if (allocation === 0) {
    return y;
  }
  const descend = Math.min(1, allocation / 0.45);
  const insert = Math.max(0, (allocation - 0.85) / 0.15);
  return mix(insert, mix(descend, y, placement.corridorY), placement.targetY);
}
/** Who holds a credit: its donor, the pool, the coordinator, or a request. */
function _getTokenOwner({
  allocation,
  pooling,
}: Readonly<{ allocation: number; pooling: number }>): string {
  if (allocation === 1) {
    return "request";
  }
  if (allocation > 0) {
    return "coordinator";
  }
  return pooling === 1 ? "pool" : "donor";
}
/**
 * Every authored credit tips into the pool, then shares its request scoop's
 * rigid travel.
 */
export function getAllocationTokensFromInputAndFrame({
  input,
  frame,
  motion,
}: AllocationTokensArgs): GetAllocationTokensResult[] {
  const identities = getAllocationIdentitiesFromInput(input);
  return identities.map((token, index) => {
    const placement = _getPlacement({ input, identities, index });
    const tray = getDonorTrayFromInputAndFrame({
      input,
      frame,
      donorIndex: token.donorIndex,
      motion,
    });
    const pooling = motion.ramp(
      frame,
      32 + token.donorIndex * motion.scaleStagger(3),
      motion.scale(20),
      motion.travel.easing,
    );
    const { x, y } = _getPooledPoint({ token, tray, placement, pooling });
    const allocation =
      token.requestId === null
        ? 0
        : motion.ramp(
            frame,
            64 + placement.requestIndex * motion.scaleStagger(20),
            motion.scale(14),
            motion.travel.easing,
          );
    const slide = Math.max(0, Math.min(1, (allocation - 0.45) / 0.4));
    return {
      ...token,
      x: mix(slide, x, placement.targetX),
      y: _getAllocatedY({ allocation, y, placement }),
      owner: _getTokenOwner({ allocation, pooling }),
      arrived: allocation === 1,
    };
  });
}

import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AquiferCutawayRequestedLabel } from "./AquiferCutawayRequestedLabel/AquiferCutawayRequestedLabel";
import { AquiferCutawayUnallocated } from "./AquiferCutawayUnallocated/AquiferCutawayUnallocated";
import { AquiferFlowPaths } from "./AquiferFlowPaths/AquiferFlowPaths";
import { AquiferRequestBoundary } from "./AquiferRequestBoundary/AquiferRequestBoundary";
import { AquiferReservoirBoundary } from "./AquiferReservoirBoundary/AquiferReservoirBoundary";
import { AquiferStorageBoundary } from "./AquiferStorageBoundary/AquiferStorageBoundary";
import { AquiferStorageFill } from "./AquiferStorageFill/AquiferStorageFill";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type AquiferStorageState = {
  flows: Input["flows"];
  height: number;
  paths: AquiferFlowPath[];
};
type AquiferFlowPath = {
  key: string;
  number: number;
  x: number;
  y: number;
  path: string;
  progress: number;
  value: number;
  color: string;
};

/** Inputs for AquiferCutaway. */
type Props = { frame: number; accent: string; input: Input };
const DRAW_ON_LENGTH = 1;

type GetAquiferStorageStateOptions = {
  frame: number;
  accent: string;
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored aquifer storage state. */
function _getAquiferStorageState({
  frame,
  accent,
  input,
  tokens,
  motion,
}: Readonly<GetAquiferStorageStateOptions>): AquiferStorageState {
  const recharge = motion.ramp(
      frame,
      36,
      motion.scale(30),
      motion.travel.easing,
    ),
    withdraw = motion.ramp(frame, 72, motion.scale(36), motion.travel.easing);
  const { aquifer, flows } = input;
  const peak = aquifer.initialM3 + flows.rechargeM3;
  const final = peak - flows.naturalOutflowM3 - flows.approvedWithdrawalM3;
  const storage = withdraw
    ? interpolateFiniteRange({ from: peak, to: final, progress: withdraw })
    : interpolateFiniteRange({
        from: aquifer.initialM3,
        to: peak,
        progress: recharge,
      });
  const height = 150 * (storage / aquifer.diagramCapacityM3);
  const paths = _createAquiferFlowPathsFromQuantities({
    flows,
    recharge,
    withdraw,
    accent,
    tokens,
  });
  return { flows, height, paths };
}

/** Builds the three authored flow paths and their quantity markers. */
function _createAquiferFlowPathsFromQuantities({
  flows,
  recharge,
  withdraw,
  accent,
  tokens,
}: Readonly<CreateAquiferFlowPathsFromQuantitiesOptions>): AquiferFlowPath[] {
  return [
    {
      key: "recharge",
      number: 1,
      x: 92,
      y: 260,
      path: "M 110 260 H 300",
      progress: recharge,
      value: flows.rechargeM3,
      color: accent,
    },
    {
      key: "approved",
      number: 2,
      x: 868,
      y: 220,
      path: "M 620 310 V 220 H 850",
      progress: withdraw,
      value: flows.approvedWithdrawalM3,
      color: tokens.color.accentAlt,
    },
    {
      key: "natural",
      number: 3,
      x: 868,
      y: 330,
      path: "M 700 330 H 850",
      progress: withdraw,
      value: flows.naturalOutflowM3,
      color: tokens.color.highlight,
    },
  ];
}

/** Recharge, pumping and natural outflow cross separate physical boundaries. */
export function AquiferCutaway({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { flows, height, paths } = _getAquiferStorageState({
    frame,
    accent,
    input,
    tokens,
    motion,
  });
  return (
    <g>
      <AquiferReservoirBoundary tokens={tokens} scales={scales} />
      <AquiferStorageFill {...{ height, accent, tokens }} />
      <AquiferStorageBoundary tokens={tokens} scales={scales} />
      <AquiferFlowPaths
        {...{ paths, tokens, scales, atomic }}
        drawOnLength={DRAW_ON_LENGTH}
      />
      <AquiferRequestBoundary {...{ scales, tokens, atomic }} />
      <AquiferCutawayRequestedLabel input={input} />
      <AquiferCutawayUnallocated {...{ input, flows, tokens }} />
    </g>
  );
}

/** The type of `DRAW_ON_LENGTH` used by AquiferCutaway. */
export type AquiferCutawayDrawOnLengthValue = typeof DRAW_ON_LENGTH;

type CreateAquiferFlowPathsFromQuantitiesOptions = {
  flows: Input["flows"];
  recharge: number;
  withdraw: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

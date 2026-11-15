import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./AquiferAllocationBalance.schema";
/** Complete fictional inputs for the bounded stock animation. */
export const DEFAULT_INPUT: Input = {
  aquifer: {
    initialM3: 1000,
    diagramCapacityM3: 1400,
  },
  flows: {
    rechargeM3: 120,
    naturalOutflowM3: 30,
    requestedWithdrawalM3: 200,
    approvedWithdrawalM3: 150,
  },
  boundary: {
    label: "Schematic local aquifer",
    periodLabel: "One fictional allocation period",
    scopeLabel: "Storage and listed boundary flows",
  },
  decision: {
    actorLabel: "Water allocation planner",
    actionLabel: "Set approved withdrawal",
  },
  showUnallocatedRequest: true,
  copy: {
    initial: "Initial storage",
    recharge: "Recharge",
    naturalOutflow: "Natural outflow",
    requested: "Requested withdrawal",
    approved: "Approved withdrawal",
    unallocated: "Request not allocated",
    final: "Final storage",
    unit: "m3",
    disclaimer: "Fictional budget; not a sustainable-yield model",
  },
};
/** Invalid authored documents are rejected instead of silently repaired. */
export const invalidInputs: unknown[] = [{}, { ...DEFAULT_INPUT, extra: true }];
/** Changed input independently exercises the central semantic invariant. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  aquifer: { initialM3: 0.5, diagramCapacityM3: 2 },
  flows: {
    rechargeM3: 1.5,
    naturalOutflowM3: 0.25,
    requestedWithdrawalM3: 1.5,
    approvedWithdrawalM3: 0.75,
  },
};
invalidInputs.push(
  {
    ...DEFAULT_INPUT,
    flows: { ...DEFAULT_INPUT.flows, approvedWithdrawalM3: 201 },
  },
  { ...DEFAULT_INPUT, aquifer: { initialM3: 0, diagramCapacityM3: 1400 } },
  { ...DEFAULT_INPUT, flows: { ...DEFAULT_INPUT.flows, rechargeM3: 500 } },
);
const minimum: Input = {
  ...DEFAULT_INPUT,
  aquifer: { initialM3: 0, diagramCapacityM3: 1 },
  flows: {
    rechargeM3: 0,
    naturalOutflowM3: 0,
    requestedWithdrawalM3: 1000000,
    approvedWithdrawalM3: 0,
  },
  showUnallocatedRequest: false,
};
const dense: Input = {
  ...changedInput,
  boundary: {
    label: "界".repeat(44),
    periodLabel: "界".repeat(44),
    scopeLabel: "界".repeat(44),
  },
  decision: { actorLabel: "界".repeat(34), actionLabel: "界".repeat(34) },
  copy: {
    initial: "界".repeat(28),
    recharge: "界".repeat(28),
    naturalOutflow: "界".repeat(28),
    requested: "界".repeat(28),
    approved: "界".repeat(28),
    unallocated: "界".repeat(28),
    final: "界".repeat(28),
    unit: "界".repeat(8),
    disclaimer: "界".repeat(56),
  },
};
/** Accepted storage extremes keep demand separate from physical water. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changedInput },
  {
    id: "recharge-capacity",
    input: { ...minimum, flows: { ...minimum.flows, rechargeM3: 1 } },
  },
  {
    id: "final-zero",
    input: {
      ...minimum,
      flows: {
        rechargeM3: 1,
        naturalOutflowM3: 0.25,
        requestedWithdrawalM3: 1,
        approvedWithdrawalM3: 0.75,
      },
    },
  },
  {
    id: "zero-approval-visible",
    input: { ...minimum, showUnallocatedRequest: true },
  },
];

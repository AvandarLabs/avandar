import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
/** Complete fictional authored defaults. */
export const DEFAULT_INPUT: Input = {
  referrals: [
    {
      id: "r1",
      personLabel: "Person A",
      attended: true,
      acknowledged: true,
    },
    {
      id: "r2",
      personLabel: "Person B",
      attended: true,
      acknowledged: false,
    },
    {
      id: "r3",
      personLabel: "Person C",
      attended: false,
      acknowledged: false,
    },
  ],
  services: {
    referring: "Hill clinic",
    receiving: "Example service",
  },
  sceneLabel: "Fictional example",
  emphasis: "return-message",
  showLedger: true,
  copy: {
    waiting: "Awaiting attendance",
    attendedOpen: "Attended, return not recorded",
    closed: "Acknowledgement returned",
    referrals: "Referrals",
    attendance: "Recorded attendance",
    returned: "Returned acknowledgements",
  },
};

const minimumInput: Input = {
  ...DEFAULT_INPUT,
  referrals: [
    { id: "", personLabel: "", attended: false, acknowledged: false },
  ],
};
const denseInput: Input = {
  ...DEFAULT_INPUT,
  referrals: Array.from({ length: 5 }, (_, index) => ({
    id: `referral ${index}`,
    personLabel: "W".repeat(18),
    attended: index !== 4,
    acknowledged: index < 2,
  })),
  services: { referring: "W".repeat(24), receiving: "W".repeat(24) },
  sceneLabel: "W".repeat(40),
  copy: {
    waiting: "W".repeat(42),
    attendedOpen: "W".repeat(42),
    closed: "W".repeat(42),
    referrals: "W".repeat(42),
    attendance: "W".repeat(42),
    returned: "W".repeat(42),
  },
};
/** Attendance without any returned acknowledgement keeps every loop open. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  referrals: DEFAULT_INPUT.referrals.map((referral) => ({
    ...referral,
    attended: true,
    acknowledged: false,
  })),
};
const toggledInput: Input = {
  ...denseInput,
  emphasis: "person-journey",
  showLedger: false,
};
/** Impossible acknowledgements, duplicate IDs and strict-shape rejections. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, referrals: [] },
  {
    ...DEFAULT_INPUT,
    referrals: [
      { id: "x", personLabel: "P", attended: false, acknowledged: true },
    ],
  },
  {
    ...DEFAULT_INPUT,
    referrals: [DEFAULT_INPUT.referrals[0], DEFAULT_INPUT.referrals[0]],
  },
  { ...DEFAULT_INPUT, services: { ...DEFAULT_INPUT.services, extra: "x" } },
  { ...DEFAULT_INPUT, services: { referring: "", receiving: "x" } },
  { ...DEFAULT_INPUT, emphasis: "closed" },
  { ...DEFAULT_INPUT, sceneLabel: "W".repeat(41) },
];
/** Default, minimum, dense, changed and toggled complete examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
  { id: "toggled", input: toggledInput },
];

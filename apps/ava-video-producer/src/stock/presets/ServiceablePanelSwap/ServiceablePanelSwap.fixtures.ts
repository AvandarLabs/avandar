import type { Input } from "./ServiceablePanelSwap.schema";
/** Complete fictional default, used only for omitted input. */
export const DEFAULT_INPUT: Input = {
  modules: [
    { id: "input", label: "Input unit" },
    { id: "control", label: "Control unit" },
    { id: "output", label: "Output unit" },
  ],
  replacement: {
    targetModuleId: "control",
    id: "control-b",
    label: "Revised control",
  },
  workerLabel: "Maintainer",
  enclosure: "console",
  labels: {
    whole: "Stable enclosure",
    changed: "One local change",
    retained: "Unchanged modules",
    removed: "Removed original",
    example: "Fictional maintainability metaphor",
  },
  showConnectorGuide: true,
};
/** Default, minimum, dense and changed semantic documents. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      modules: [
        { id: "input", label: "Input unit" },
        { id: "control", label: "Control unit" },
        { id: "output", label: "Output unit" },
      ],
      replacement: {
        targetModuleId: "control",
        id: "control-b",
        label: "Revised control",
      },
      workerLabel: "Maintainer",
      enclosure: "console",
      labels: {
        whole: "Stable enclosure",
        changed: "One local change",
        retained: "Unchanged modules",
        removed: "Removed original",
        example: "Fictional maintainability metaphor",
      },
      showConnectorGuide: true,
    },
  },
  {
    id: "minimum",
    input: {
      modules: [
        { id: "input", label: "Input unit" },
        { id: "control", label: "Control unit" },
      ],
      replacement: {
        targetModuleId: "control",
        id: "control-b",
        label: "Revised control",
      },
      workerLabel: "Maintainer",
      enclosure: "cabinet",
      labels: {
        whole: "Stable enclosure",
        changed: "One local change",
        retained: "Unchanged modules",
        removed: "Removed original",
        example: "Fictional maintainability metaphor",
      },
      showConnectorGuide: false,
    },
  },
  {
    id: "dense",
    input: {
      modules: [
        { id: "aaaaaaaaaaaaaaaaaaaa", label: "WWWWWWWWWWWWWWWWWWWWWW" },
        { id: "bbbbbbbbbbbbbbbbbbbb", label: "WWWWWWWWWWWWWWWWWWWWWW" },
        { id: "cccccccccccccccccccc", label: "WWWWWWWWWWWWWWWWWWWWWW" },
        { id: "dddddddddddddddddddd", label: "WWWWWWWWWWWWWWWWWWWWWW" },
      ],
      replacement: {
        targetModuleId: "dddddddddddddddddddd",
        id: "rrrrrrrrrrrrrrrrrrrr",
        label: "WWWWWWWWWWWWWWWWWWWWWW",
      },
      workerLabel: "WWWWWWWWWWWWWWWWWWWW",
      enclosure: "console",
      labels: {
        whole: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        changed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        removed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showConnectorGuide: true,
    },
  },
  {
    id: "changed",
    input: {
      modules: [
        { id: "input", label: "Input unit" },
        { id: "control", label: "Control unit" },
        { id: "output", label: "Output unit" },
      ],
      replacement: {
        targetModuleId: "input",
        id: "new-input",
        label: "New input",
      },
      workerLabel: "Maintainer",
      enclosure: "cabinet",
      labels: {
        whole: "Stable enclosure",
        changed: "One local change",
        retained: "Unchanged modules",
        removed: "Removed original",
        example: "Fictional maintainability metaphor",
      },
      showConnectorGuide: false,
    },
  },
];
/** Invalid structures, bounds, and cross references. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, modules: [] },
  { ...DEFAULT_INPUT, modules: [DEFAULT_INPUT.modules[0]] },
  { ...DEFAULT_INPUT, modules: Array(5).fill(DEFAULT_INPUT.modules[0]) },
  {
    ...DEFAULT_INPUT,
    modules: [DEFAULT_INPUT.modules[0], DEFAULT_INPUT.modules[0]],
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, targetModuleId: "absent" },
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, id: "input" },
  },
  { ...DEFAULT_INPUT, enclosure: "box" },
  { ...DEFAULT_INPUT, showConnectorGuide: "true" },
  {
    ...DEFAULT_INPUT,
    modules: DEFAULT_INPUT.modules.map((item, index) =>
      index === 0 ? { ...item, id: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    modules: DEFAULT_INPUT.modules.map((item, index) =>
      index === 0 ? { ...item, id: "W".repeat(21) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    modules: DEFAULT_INPUT.modules.map((item, index) =>
      index === 0 ? { ...item, label: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    modules: DEFAULT_INPUT.modules.map((item, index) =>
      index === 0 ? { ...item, label: "W".repeat(23) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, targetModuleId: "" },
  },
  {
    ...DEFAULT_INPUT,
    replacement: {
      ...DEFAULT_INPUT.replacement,
      targetModuleId: "W".repeat(21),
    },
  },
  { ...DEFAULT_INPUT, replacement: { ...DEFAULT_INPUT.replacement, id: "" } },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, id: "W".repeat(21) },
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, label: "" },
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, label: "W".repeat(23) },
  },
  { ...DEFAULT_INPUT, workerLabel: "" },
  { ...DEFAULT_INPUT, workerLabel: "W".repeat(21) },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, whole: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, whole: "W".repeat(37) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, changed: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, changed: "W".repeat(37) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, retained: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, retained: "W".repeat(37) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, removed: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, removed: "W".repeat(37) },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, example: "" } },
  {
    ...DEFAULT_INPUT,
    labels: { ...DEFAULT_INPUT.labels, example: "W".repeat(37) },
  },
  {
    ...DEFAULT_INPUT,
    modules: DEFAULT_INPUT.modules.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    replacement: { ...DEFAULT_INPUT.replacement, extra: true },
  },
  { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
];

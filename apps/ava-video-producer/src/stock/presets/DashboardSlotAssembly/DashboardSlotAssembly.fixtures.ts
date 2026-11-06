import type { Input } from "./DashboardSlotAssembly.schema";
/** Complete fictional dashboard containing three independent views. */
export const DEFAULT_INPUT: Input = {
  boardTitle: "Fictional stock overview",
  widgets: [
    {
      id: "stock",
      title: "Available units",
      kind: "value",
      lines: ["18 units"],
    },
    {
      id: "supplies",
      title: "Supplies",
      kind: "list",
      lines: ["Paper", "Ink", "Labels"],
    },
    {
      id: "note",
      title: "Context",
      kind: "note",
      lines: ["Sample inventory only"],
    },
  ],
  featuredWidgetId: "stock",
  layout: "feature-left",
  scopeLabel: "Demo workspace",
  showGuides: true,
};
/** Empty upper-only text, dense panels and changed editorial priority. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      ...DEFAULT_INPUT,
      widgets: [
        { id: "", title: "", kind: "value", lines: [""] },
        { id: "b", title: "", kind: "note", lines: [""] },
      ],
      featuredWidgetId: "",
      scopeLabel: "",
      showGuides: false,
    },
  },
  {
    id: "dense",
    input: {
      ...DEFAULT_INPUT,
      boardTitle: "W".repeat(48),
      widgets: Array.from({ length: 4 }, (_, index) => ({
        id: `widget ${index}`,
        title: "W".repeat(28),
        kind:
          index === 0
            ? ("value" as const)
            : index === 1
              ? ("list" as const)
              : ("note" as const),
        lines: Array.from({ length: index === 0 ? 1 : 3 }, () =>
          "W".repeat(38),
        ),
      })),
      featuredWidgetId: "widget 3",
      scopeLabel: "W".repeat(36),
    },
  },
  {
    id: "changed",
    input: {
      ...DEFAULT_INPUT,
      featuredWidgetId: "supplies",
      layout: "feature-top",
      boardTitle: "Example supply report",
      scopeLabel: "Example team",
    },
  },
];

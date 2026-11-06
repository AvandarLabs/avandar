import type { Input } from "./BatchRelease.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  batches: [
    {
      id: "batch-a",
      label: "Bundle A",
      items: [
        {
          id: "a",
          label: "A",
        },
        {
          id: "b",
          label: "B",
        },
        {
          id: "c",
          label: "C",
        },
      ],
    },
  ],
  intakeLabel: "Arriving items",
  boundaryLabel: "Dispatch",
  destinationLabel: "Collected bundles",
  releaseLabel: "Group complete",
  showItemLabels: true,
};
/** Accepted minimum, crowded, changed, and toggle cases. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      batches: [
        {
          id: "batch-a",
          label: "Bundle A",
          items: [
            {
              id: "a",
              label: "A",
            },
            {
              id: "b",
              label: "B",
            },
            {
              id: "c",
              label: "C",
            },
          ],
        },
      ],
      intakeLabel: "Arriving items",
      boundaryLabel: "Dispatch",
      destinationLabel: "Collected bundles",
      releaseLabel: "Group complete",
      showItemLabels: true,
    },
  },
  {
    id: "minimum",
    input: {
      batches: [
        {
          id: "",
          label: "",
          items: [
            {
              id: "空 間",
              label: "",
            },
            {
              id: "b",
              label: "B",
            },
          ],
        },
      ],
      intakeLabel: "Arriving items",
      boundaryLabel: "Dispatch",
      destinationLabel: "Collected bundles",
      releaseLabel: "Group complete",
      showItemLabels: true,
    },
  },
  {
    id: "dense",
    input: {
      batches: [
        {
          id: "group 0",
          label: "WWWWWWWWWWWWWWWWWW",
          items: [
            {
              id: "0 item 0",
              label: "WWWWWWWWWWWW",
            },
            {
              id: "0 item 1",
              label: "WWWWWWWWWWWW",
            },
            {
              id: "0 item 2",
              label: "WWWWWWWWWWWW",
            },
          ],
        },
        {
          id: "group 1",
          label: "WWWWWWWWWWWWWWWWWW",
          items: [
            {
              id: "1 item 0",
              label: "WWWWWWWWWWWW",
            },
            {
              id: "1 item 1",
              label: "WWWWWWWWWWWW",
            },
            {
              id: "1 item 2",
              label: "WWWWWWWWWWWW",
            },
          ],
        },
      ],
      intakeLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      boundaryLabel: "WWWWWWWWWWWWWWWWWWWW",
      destinationLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      releaseLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      showItemLabels: true,
    },
  },
  {
    id: "changed",
    input: {
      batches: [
        {
          id: "other",
          label: "Next group",
          items: [
            {
              id: "x",
              label: "X",
            },
            {
              id: "y",
              label: "Y",
            },
          ],
        },
      ],
      intakeLabel: "Arriving items",
      boundaryLabel: "Dispatch",
      destinationLabel: "Collected bundles",
      releaseLabel: "Group complete",
      showItemLabels: false,
    },
  },
];
